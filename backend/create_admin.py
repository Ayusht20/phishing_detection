from getpass import getpass

from app.database import SessionLocal, Base, engine
from app.models.user import User
from app.utils.security import hash_password

Base.metadata.create_all(bind=engine)


def main():
    email = input("Admin email: ").strip().lower()
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if user:
            user.role = "admin"
            db.commit()
            print(f"Existing user {email} promoted to admin.")
            return

        name = input("Admin name: ").strip()
        password = getpass("Admin password: ")
        if len(password) < 8:
            print("Password must be at least 8 characters.")
            return
        if password != getpass("Confirm password: "):
            print("Passwords do not match.")
            return

        db.add(User(name=name, email=email, hashed_password=hash_password(password), role="admin"))
        db.commit()
        print(f"Admin {email} created.")
    finally:
        db.close()


if __name__ == "__main__":
    main()