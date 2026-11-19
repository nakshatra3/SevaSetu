import sys
from datetime import datetime, timedelta

from app import database
from app.config import settings
from app.routes.attendance import record_attendance
from app.routes.events import event_fields, new_checkin_code
from app.schemas import EventCreate, RegisterRequest
from app.security import hash_password
from app.services.auth_service import register_user
from app.utils.gamification import award_points, calculate_donation_points, check_and_award_badges
from app.utils.helpers import now

DEMO_DOMAIN = "sevasetu.demo"


def create_admin(db):
    if not settings.ADMIN_EMAIL or not settings.ADMIN_PASSWORD:
        print("! ADMIN_EMAIL / ADMIN_PASSWORD are not set in .env, so no admin was created.")
        return
    email = settings.ADMIN_EMAIL.strip().lower()
    if db.users.find_one({"email": email}):
        print(f"- Admin {email} already exists.")
        return
    db.users.insert_one(
        {
            "name": "Platform Admin",
            "email": email,
            "password_hash": hash_password(settings.ADMIN_PASSWORD),
            "role": "admin",
            "is_active": True,
            "created_at": now(),
        }
    )
    print(f"+ Admin created: {email}")


def add_user(db, name, email, role, org_name=None, referral_code=None):
    data = RegisterRequest(
        name=name, email=email, password=settings.DEMO_PASSWORD, role=role,
        organization_name=org_name, referral_code=referral_code,
    )
    return register_user(db, data)


def add_event(db, org, title, category, city, address, lat, lng, start, hours, capacity, skills, description):
    data = EventCreate(
        title=title, description=description, category=category, city=city, address=address,
        latitude=lat, longitude=lng, start_time=start, end_time=start + timedelta(hours=hours),
        capacity=capacity, skills_required=skills,
    )
    event = {
        **event_fields(data, category),
        "organization_id": org["_id"],
        "created_by": org["user_id"],
        "registered_count": 0,
        "status": "active",
        "checkin_code": new_checkin_code(),
        "created_at": now(),
    }
    event["_id"] = db.events.insert_one(event).inserted_id
    return event


def add_registration(db, event, volunteer):
    db.registrations.insert_one(
        {"event_id": event["_id"], "volunteer_id": volunteer["_id"], "status": "registered",
         "registered_at": now(), "cancelled_at": None}
    )
    db.events.update_one({"_id": event["_id"]}, {"$inc": {"registered_count": 1}})


def at(days, hour, minute=0):
    return (datetime.now() + timedelta(days=days)).replace(hour=hour, minute=minute, second=0, microsecond=0)


def seed_demo_data(db):
    if not settings.DEMO_PASSWORD:
        print("! DEMO_PASSWORD is not set in .env, so demo accounts were not created.")
        return
    if db.users.find_one({"email": f"asha@{DEMO_DOMAIN}"}):
        print("- Demo data already exists. Use --reset to start again.")
        return

    # Organizations
    green_user = add_user(db, "Rohan Mehta", f"green@{DEMO_DOMAIN}", "organization", "Green Earth Trust")
    food_user = add_user(db, "Fatima Shaikh", f"food@{DEMO_DOMAIN}", "organization", "Annapurna Food Bank")
    vidya_user = add_user(db, "Kavya Iyer", f"vidya@{DEMO_DOMAIN}", "organization", "Vidya Teaching Foundation")

    profiles = {
        green_user["_id"]: ("Planting trees and cleaning beaches across Mumbai since 2015.", "Mumbai", "Powai", ["Plantation", "Cleaning"], "verified"),
        food_user["_id"]: ("We collect surplus food and serve 500 meals a day.", "Mumbai", "Dadar", ["Food Distribution"], "pending"),
        vidya_user["_id"]: ("Free evening classes for children in municipal schools.", "Mumbai", "Andheri", ["Teaching"], "verified"),
    }
    for user_id, (description, city, address, categories, status) in profiles.items():
        update = {"description": description, "city": city, "address": address, "categories": categories,
                  "verification_status": status, "contact_email": ""}
        if status == "pending":
            update["verification_request"] = {"note": "Registered trust, documents available.",
                                              "registration_number": "MH/2019/7731", "submitted_at": now()}
        db.organizations.update_one({"user_id": user_id}, {"$set": update})
    green = db.organizations.find_one({"user_id": green_user["_id"]})
    food = db.organizations.find_one({"user_id": food_user["_id"]})
    vidya = db.organizations.find_one({"user_id": vidya_user["_id"]})

    # Volunteers 
    asha = add_user(db, "Asha Kulkarni", f"asha@{DEMO_DOMAIN}", "volunteer")
    ravi = add_user(db, "Ravi Patil", f"ravi@{DEMO_DOMAIN}", "volunteer")
    meera = add_user(db, "Meera Nair", f"meera@{DEMO_DOMAIN}", "volunteer", referral_code=asha["referral_code"])
    arjun = add_user(db, "Arjun Rao", f"arjun@{DEMO_DOMAIN}", "volunteer", referral_code=asha["referral_code"])

    volunteer_profiles = [
        (asha, "Mumbai", "IIT Bombay", ["Teaching", "English", "Gardening"], ["Teaching", "Plantation"], ["Weekends", "Weekday evenings"], 19.1334, 72.9133),
        (ravi, "Mumbai", "VJTI", ["Cooking", "Driving"], ["Food Distribution", "Cleaning"], ["Weekends"], 19.0222, 72.8561),
        (meera, "Mumbai", "IIT Bombay", ["First Aid", "Teamwork"], ["Healthcare", "Cleaning"], ["Weekday mornings", "Weekends"], 19.1197, 72.9050),
        (arjun, "Pune", "COEP", ["Maths", "Teaching"], ["Teaching"], ["Weekday afternoons"], 18.5293, 73.8565),
    ]
    for user, city, college, skills, interests, availability, lat, lng in volunteer_profiles:
        db.volunteer_profiles.update_one(
            {"user_id": user["_id"]},
            {"$set": {"city": city, "college": college, "skills": skills, "interests": interests,
                      "availability": availability, "latitude": lat, "longitude": lng,
                      "bio": f"Student volunteer from {college}."}},
        )

    # Past events 
    past_events = [
        (green, "Juhu Beach Clean-up", "Cleaning", "Juhu Beach", 19.0988, 72.8267, at(-30, 7), 3, [asha, ravi, meera]),
        (green, "Powai Lake Tree Plantation", "Plantation", "Powai Lake", 19.1260, 72.9050, at(-20, 8), 4, [asha, meera]),
        (green, "Aarey Sapling Drive", "Plantation", "Aarey Colony", 19.1550, 72.8710, at(-10, 7), 3, [asha]),
        (food, "Dadar Meal Distribution", "Food Distribution", "Dadar Station East", 19.0178, 72.8478, at(-6, 18), 2, [ravi, arjun]),
        (vidya, "Weekend Reading Club", "Teaching", "Andheri Municipal School", 19.1197, 72.8468, at(-3, 10), 2, [asha, arjun]),
    ]
    for org, title, category, address, lat, lng, start, hours, attendees in past_events:
        event = add_event(db, org, title, category, "Mumbai", address, lat, lng, start, hours, 30,
                          ["Teamwork"], f"{title}: a community activity organised by {org['name']}.")
        for volunteer in attendees:
            add_registration(db, event, volunteer)
            record_attendance(db, event, volunteer["_id"], hours, "organizer", org["user_id"])

    # An event happening right now
    live = add_event(
        db, green, "Mithi River Bank Clean-up (live demo)", "Cleaning", "Mumbai", "Kurla, Mithi River",
        19.0720, 72.8790, now() - timedelta(minutes=30), 4, 25, ["Teamwork"],
        "Happening now: use this event to try QR check-in from the organizer's Manage page.",
    )
    for volunteer in [asha, ravi, meera]:
        add_registration(db, live, volunteer)

    # Upcoming events around Mumbai
    upcoming = [
        (vidya, "Saturday English Class", "Teaching", "Andheri Municipal School", 19.1197, 72.8468, at(3, 10), 2, 15, ["English", "Teaching"]),
        (green, "Versova Beach Clean-up", "Cleaning", "Versova Beach", 19.1351, 72.8146, at(5, 7), 3, 40, ["Teamwork"]),
        (green, "IIT Bombay Campus Plantation", "Plantation", "IIT Bombay, Powai", 19.1334, 72.9133, at(6, 8), 3, 25, ["Gardening"]),
        (food, "Community Kitchen Helpers", "Food Distribution", "Dadar West", 19.0190, 72.8420, at(4, 18), 3, 12, ["Cooking"]),
        (vidya, "Maths Tutoring for Class 8", "Teaching", "Kurla School No. 2", 19.0726, 72.8845, at(8, 15), 2, 2, ["Maths"]),
        (food, "Elderly Home Lunch Service", "Elderly Care", "Bandra West", 19.0596, 72.8295, at(9, 12), 2, 10, ["Cooking", "Teamwork"]),
        (green, "Thane Creek Mangrove Clean-up", "Cleaning", "Thane", 19.2183, 72.9781, at(12, 7), 4, 30, ["Teamwork"]),
    ]
    upcoming_events = []
    for org, title, category, address, lat, lng, start, hours, capacity, skills in upcoming:
        upcoming_events.append(add_event(
            db, org, title, category, "Mumbai", address, lat, lng, start, hours, capacity, skills,
            f"{title}. Join {org['name']} and make a difference in your city. Please arrive 10 minutes early.",
        ))
    add_registration(db, upcoming_events[0], meera)
    add_registration(db, upcoming_events[4], arjun)  # Maths class: 1 of 2 spots taken

    # Donations: verified ones award points once; pending ones wait for the organization
    donations = [
        (ravi, food, "money", 1500, None, "For the monthly ration drive", "verified"),
        (asha, vidya, "books", None, 12, "Story books for the reading club", "verified"),
        (meera, food, "food", None, 10, "10 kg rice", "pending"),
    ]
    for donor, org, kind, amount, quantity, description, status in donations:
        donation = {"donor_id": donor["_id"], "organization_id": org["_id"], "type": kind, "amount": amount,
                    "quantity": quantity, "description": description, "status": status, "points_awarded": 0,
                    "created_at": now()}
        donation["_id"] = db.donations.insert_one(donation).inserted_id
        if status == "verified":
            points = calculate_donation_points(donation)
            award_points(db, donor["_id"], points, "donation", f"Verified {kind} donation",
                         f"donation:{donation['_id']}", org["_id"])
            db.donations.update_one({"_id": donation["_id"]}, {"$set": {"points_awarded": points}})
            check_and_award_badges(db, donor["_id"])

    # Reviews from volunteers who attended
    juhu = db.events.find_one({"title": "Juhu Beach Clean-up"})
    reviews = [
        (asha, green, juhu, 5, "Very well organised, gloves and water were provided."),
        (ravi, green, None, 4, "Friendly team and clear instructions."),
        (arjun, food, None, 5, "Great cause, I will come again."),
    ]
    for volunteer, org, event, rating, comment in reviews:
        db.reviews.insert_one({"reviewer_id": volunteer["_id"], "organization_id": org["_id"],
                               "event_id": event["_id"] if event else None, "rating": rating,
                               "comment": comment, "created_at": now()})

    # One open report for the admin to moderate
    db.reports.insert_one({"reporter_id": ravi["_id"], "target_type": "event", "target_id": upcoming_events[3]["_id"],
                           "target_label": upcoming_events[3]["title"], "reason": "other",
                           "details": "The address on the listing seems incomplete.", "status": "open",
                           "resolution_note": "", "created_at": now()})

    print("+ Demo data created (3 organizations, 4 volunteers, 13 events).")
    print(f"  Demo logins (password = DEMO_PASSWORD from .env): asha@{DEMO_DOMAIN}, ravi@{DEMO_DOMAIN},")
    print(f"  meera@{DEMO_DOMAIN}, arjun@{DEMO_DOMAIN}, green@{DEMO_DOMAIN}, food@{DEMO_DOMAIN}, vidya@{DEMO_DOMAIN}")


def main():
    database.connect_to_mongo()
    db = database.get_db()
    print(f"Connected to {settings.MONGODB_DATABASE}")

    if "--reset" in sys.argv:
        database.client.drop_database(settings.MONGODB_DATABASE)
        db = database.client[settings.MONGODB_DATABASE]
        database.setup_database(db)
        print("- Database cleared.")

    create_admin(db)
    if "--admin-only" not in sys.argv:
        seed_demo_data(db)
    database.close_mongo()


if __name__ == "__main__":
    main()
