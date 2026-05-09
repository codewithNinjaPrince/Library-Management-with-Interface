from types import SimpleNamespace

import pytest
from bson import ObjectId
from fastapi.testclient import TestClient

from app.auth import create_access_token
from app.main import app
from app.routes import analytics, auth_routes, books, borrow, members, uploads


class AsyncCursor:
    def __init__(self, rows):
        self.rows = list(rows)

    def __aiter__(self):
        self.index = 0
        return self

    async def __anext__(self):
        if self.index >= len(self.rows):
            raise StopAsyncIteration

        row = self.rows[self.index]
        self.index += 1
        return row.copy()


class FakeCollection:
    def __init__(self):
        self.rows = []

    async def find_one(self, query):
        for row in self.rows:
            if self._matches(row, query):
                return row.copy()
        return None

    async def insert_one(self, document):
        row = document.copy()
        row.setdefault("_id", ObjectId())
        self.rows.append(row)
        return SimpleNamespace(inserted_id=row["_id"])

    def find(self):
        return AsyncCursor(self.rows)

    async def delete_one(self, query):
        before = len(self.rows)
        self.rows = [row for row in self.rows if not self._matches(row, query)]
        return SimpleNamespace(deleted_count=before - len(self.rows))

    async def update_one(self, query, update):
        for row in self.rows:
            if not self._matches(row, query):
                continue

            for key, value in update.get("$set", {}).items():
                row[key] = value

            for key, value in update.get("$inc", {}).items():
                row[key] = row.get(key, 0) + value

            return SimpleNamespace(modified_count=1)

        return SimpleNamespace(modified_count=0)

    def aggregate(self, pipeline):
        totals = {}

        for row in self.rows:
            book_id = row.get("book_id")
            totals[book_id] = totals.get(book_id, 0) + 1

        results = [
            {"_id": book_id, "total": total}
            for book_id, total in sorted(
                totals.items(),
                key=lambda item: item[1],
                reverse=True,
            )
        ][:5]

        return AsyncCursor(results)

    def _matches(self, row, query):
        return all(str(row.get(key)) == str(value) for key, value in query.items())


@pytest.fixture()
def fake_db(monkeypatch):
    collections = {
        "users": FakeCollection(),
        "books": FakeCollection(),
        "members": FakeCollection(),
        "borrows": FakeCollection(),
    }

    monkeypatch.setattr(auth_routes, "user_collection", collections["users"])
    monkeypatch.setattr(books, "book_collection", collections["books"])
    monkeypatch.setattr(members, "member_collection", collections["members"])
    monkeypatch.setattr(borrow, "book_collection", collections["books"])
    monkeypatch.setattr(borrow, "borrow_collection", collections["borrows"])
    monkeypatch.setattr(analytics, "borrow_collection", collections["borrows"])
    monkeypatch.setattr(uploads, "book_collection", collections["books"])

    async def no_log(*args, **kwargs):
        return None

    monkeypatch.setattr(books, "create_log", no_log)

    return collections


@pytest.fixture()
def client(fake_db):
    return TestClient(app)


def auth_headers(client, username="admin123", role="admin"):
    token = create_access_token({"sub": username, "role": role})
    return {"Authorization": f"Bearer {token}"}


def test_health_check(client):
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json()["status"] == "OK"


def test_register_and_login(client, fake_db):
    payload = {
        "username": "admin123",
        "password": "secret123",
        "role": "admin",
    }

    register_response = client.post("/api/v1/auth/register", json=payload)
    assert register_response.status_code == 200
    assert register_response.json()["message"] == "User registered successfully"
    assert register_response.json()["role"] == "member"

    saved_user = fake_db["users"].rows[0]
    assert saved_user["username"] == "admin123"
    assert saved_user["password"] != "secret123"
    assert saved_user["role"] == "member"

    login_response = client.post("/api/v1/auth/login", json=payload)
    assert login_response.status_code == 200
    assert login_response.json()["token_type"] == "bearer"
    assert login_response.json()["role"] == "member"
    assert login_response.json()["access_token"]


def test_admin_can_create_user_roles(client):
    response = client.post(
        "/api/v1/auth/users",
        json={
            "username": "staff123",
            "password": "secret123",
            "role": "user",
        },
        headers=auth_headers(client),
    )

    assert response.status_code == 200
    assert response.json()["role"] == "user"


def test_member_cannot_create_user_roles(client):
    response = client.post(
        "/api/v1/auth/users",
        json={
            "username": "staff123",
            "password": "secret123",
            "role": "user",
        },
        headers=auth_headers(client, username="member123", role="member"),
    )

    assert response.status_code == 403


def test_invalid_role_registration_returns_422(client):
    response = client.post(
        "/api/v1/auth/register",
        json={
            "username": "badrole",
            "password": "secret123",
            "role": "superadmin",
        },
    )

    assert response.status_code == 422


def test_duplicate_user_registration_returns_400(client):
    payload = {
        "username": "admin123",
        "password": "secret123",
        "role": "admin",
    }

    assert client.post("/api/v1/auth/register", json=payload).status_code == 200

    response = client.post("/api/v1/auth/register", json=payload)

    assert response.status_code == 400
    assert response.json()["message"] == "User already exists"


def test_login_with_wrong_password_returns_401(client):
    payload = {
        "username": "admin123",
        "password": "secret123",
        "role": "admin",
    }
    client.post("/api/v1/auth/register", json=payload)

    response = client.post(
        "/api/v1/auth/login",
        json={**payload, "password": "wrongpass"},
    )

    assert response.status_code == 401
    assert response.json()["message"] == "Invalid credentials"


def test_books_crud_read_flow(client):
    headers = auth_headers(client)
    payload = {
        "title": "Clean Code",
        "author": "Robert Martin",
        "isbn": "9780132350884",
        "category": "Programming",
        "quantity": 3,
        "available_copies": 3,
        "shelf_location": "A1",
    }

    create_response = client.post("/api/v1/books/", json=payload, headers=headers)
    assert create_response.status_code == 200
    book_id = create_response.json()["id"]

    list_response = client.get("/api/v1/books/", headers=headers)
    assert list_response.status_code == 200
    assert list_response.json()[0]["isbn"] == payload["isbn"]

    detail_response = client.get(f"/api/v1/books/{book_id}", headers=headers)
    assert detail_response.status_code == 200
    assert detail_response.json()["title"] == payload["title"]

    duplicate_response = client.post("/api/v1/books/", json=payload, headers=headers)
    assert duplicate_response.status_code == 400
    assert duplicate_response.json()["message"] == "Duplicate ISBN found"


def test_member_can_read_books_but_cannot_add_books(client, fake_db):
    headers = auth_headers(client, username="member123", role="member")
    book_id = ObjectId()
    fake_db["books"].rows.append({
        "_id": book_id,
        "title": "Python Basics",
        "author": "Author",
        "isbn": "100",
        "category": "Programming",
        "quantity": 1,
        "available_copies": 1,
    })

    read_response = client.get(f"/api/v1/books/{book_id}", headers=headers)
    assert read_response.status_code == 200

    add_response = client.post(
        "/api/v1/books/",
        json={
            "title": "Blocked Book",
            "author": "Author",
            "isbn": "200",
            "category": "Programming",
            "quantity": 1,
            "available_copies": 1,
        },
        headers=headers,
    )
    assert add_response.status_code == 403
    assert add_response.json()["message"] == "You do not have permission to access this resource"


def test_protected_endpoint_without_token_returns_401(client):
    response = client.get("/api/v1/books/")

    assert response.status_code == 401
    assert response.json()["message"] == "Not authenticated"


def test_members_create_list_delete(client):
    headers = auth_headers(client)
    payload = {
        "name": "Rahul Sharma",
        "email": "rahul@example.com",
        "phone": "9876543210",
        "course": "BCA",
    }

    create_response = client.post("/api/v1/members/", json=payload, headers=headers)
    assert create_response.status_code == 200
    member_id = create_response.json()["id"]

    list_response = client.get("/api/v1/members/", headers=headers)
    assert list_response.status_code == 200
    assert list_response.json()[0]["email"] == payload["email"]

    delete_response = client.delete(f"/api/v1/members/{member_id}", headers=headers)
    assert delete_response.status_code == 200
    assert delete_response.json()["message"] == "Member deleted successfully"


def test_user_role_cannot_delete_member(client, fake_db):
    headers = auth_headers(client, username="staff123", role="user")
    member_id = ObjectId()
    fake_db["members"].rows.append({
        "_id": member_id,
        "name": "Rahul Sharma",
        "email": "rahul@example.com",
        "phone": "9876543210",
        "course": "BCA",
    })

    response = client.delete(f"/api/v1/members/{member_id}", headers=headers)

    assert response.status_code == 403


def test_borrow_return_and_history(client, fake_db):
    headers = auth_headers(client)
    book_id = ObjectId()
    fake_db["books"].rows.append({
        "_id": book_id,
        "title": "Python Basics",
        "available_copies": 1,
    })

    borrow_response = client.post(
        f"/api/v1/library/borrow?member_id=member-1&book_id={book_id}",
        headers=headers,
    )
    assert borrow_response.status_code == 200
    assert fake_db["books"].rows[0]["available_copies"] == 0

    history_response = client.get("/api/v1/library/history", headers=headers)
    assert history_response.status_code == 200
    assert history_response.json()[0]["status"] == "Borrowed"

    return_response = client.post(
        f"/api/v1/library/return?book_id={book_id}",
        headers=headers,
    )
    assert return_response.status_code == 200
    assert fake_db["books"].rows[0]["available_copies"] == 1
    assert fake_db["borrows"].rows[0]["status"] == "Returned"


def test_borrow_unavailable_book_returns_400(client, fake_db):
    headers = auth_headers(client, username="member123", role="member")
    book_id = ObjectId()
    fake_db["books"].rows.append({
        "_id": book_id,
        "title": "Python Basics",
        "available_copies": 0,
    })

    response = client.post(
        f"/api/v1/library/borrow?member_id=member-1&book_id={book_id}",
        headers=headers,
    )

    assert response.status_code == 400
    assert response.json()["message"] == "Book unavailable"


def test_top_books_analytics(client, fake_db):
    headers = auth_headers(client, username="staff123", role="user")
    fake_db["borrows"].rows.extend([
        {"book_id": "book-1"},
        {"book_id": "book-1"},
        {"book_id": "book-2"},
    ])

    response = client.get("/api/v1/analytics/top-books", headers=headers)

    assert response.status_code == 200
    assert response.json()[0] == {"_id": "book-1", "total": 2}


def test_upload_books_csv(client, fake_db):
    headers = auth_headers(client, username="staff123", role="user")
    csv_data = (
        "title,author,isbn,category,quantity\n"
        "Book A,Author A,111,Fiction,2\n"
        "Book B,Author B,222,Science,1\n"
    )

    response = client.post(
        "/api/v1/upload/books-csv",
        files={"file": ("books.csv", csv_data, "text/csv")},
        headers=headers,
    )

    assert response.status_code == 200
    assert response.json()["inserted_records"] == 2
    assert fake_db["books"].rows[0]["available_copies"] == 2
