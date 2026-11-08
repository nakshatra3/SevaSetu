import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import BridgeIllustration from "@/components/common/BridgeIllustration";
import EventCard from "@/components/events/EventCard";
import { useApiData } from "@/hooks/useApiData";
import { useAuth } from "@/hooks/useAuth";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { searchEvents } from "@/api/eventsApi";
import { ROLE_HOME } from "@/config/constants";

// Success stories and information about SevaSetu

const SUCCESS_STORIES = [
  {
  image: "/images/banners/cleaningImage.jpg",
  title: "Making Communities Greener",
  text: "Together, we can create cleaner and greener communities...",
  category: "Environment",
  },
  {
    title: "Education for Everyone",
    text: "Every child deserves an opportunity to learn. SevaSetu connects volunteers with educational initiatives that help children build a brighter future.",
    category: "Education",
  },
  {
    title: "Helping Those in Need",
    text: "A small act of kindness can make a big difference. Join initiatives that support underprivileged families and strengthen local communities.",
    category: "Community Support",
  },
  {
    title: "Connecting People, Creating Impact",
    text: "SevaSetu bridges the gap between passionate volunteers and organizations working toward meaningful social change.",
    category: "Our Mission",
  },
  {
    title: "About SevaSetu",
    text: "SevaSetu is a platform designed to make volunteering accessible, transparent, and rewarding by connecting people with opportunities to serve society.",
    category: "About Us",
  },
];

export default function HomePage() {
  const { isAuthenticated, user } = useAuth();

  useDocumentTitle("");

  // Fetch upcoming events from backend
  const { data: events } = useApiData(
    () => searchEvents({ limit: 3 }),
    []
  );

  // Current active banner
  const [currentSlide, setCurrentSlide] = useState(0);

  // Automatically change banner every 4 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide(
        (prev) => (prev + 1) % SUCCESS_STORIES.length
      );
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  // Next banner
  const nextSlide = () => {
    setCurrentSlide(
      (prev) => (prev + 1) % SUCCESS_STORIES.length
    );
  };

  // Previous banner
  const prevSlide = () => {
    setCurrentSlide(
      (prev) =>
        (prev - 1 + SUCCESS_STORIES.length) %
        SUCCESS_STORIES.length
    );
  };

  return (
    <div className="stack landing">

      {/* banner for success stories and about the website */}
      <section className="landing__section">

        <h2>Our Impact & Success Stories</h2>

        <p className="muted">
          Discover how small actions can create meaningful change.
        </p>

        <div className="banner-slider">

          {/* Sliding banners */}
          <div
            className="banner-slider__track"
            style={{
              transform: `translateX(-${currentSlide * 100}%)`,
            }}
          >
            {SUCCESS_STORIES.map((story) => (
              <div className="banner-slide" key={story.title}>
                <img
                  src={story.image}
                  alt={story.title}
                  className="banner-full-image"
                />
              </div>
            ))}
          </div>
          {/* Previous button */}
          <button
            type="button"
            className="banner-arrow banner-arrow--left"
            onClick={prevSlide}
            aria-label="Previous story"
          >
            &#10094;
          </button>


          {/* Next button */}
          <button
            type="button"
            className="banner-arrow banner-arrow--right"
            onClick={nextSlide}
            aria-label="Next story"
          >
            &#10095;
          </button>


          {/* Navigation dots */}
          <div className="banner-dots">

            {SUCCESS_STORIES.map((story, index) => (

              <button
                type="button"
                key={story.title}
                className={`banner-dot ${
                  index === currentSlide ? "active" : ""
                }`}
                onClick={() => setCurrentSlide(index)}
                aria-label={`Go to story ${index + 1}`}
                aria-current={
                  index === currentSlide ? "true" : undefined
                }
              />

            ))}

          </div>

        </div>

      </section>


      {/* hero section , in which men idea of the page will be defined */}
      <section className="hero">

        <div className="hero__text">
          <h1>
            Connect people who want to help with places that need them.
          </h1>

          <p>
            SevaSetu matches volunteers with nearby organizations,
            so a free Sunday can turn into a cleaner beach,
            a taught class or a shared meal.
          </p>

          <div className="hero__actions">

            {isAuthenticated ? (
              <Link
                className="btn btn--primary"
                to={ROLE_HOME[user?.role] || "/app"}
              >
                Go to my dashboard
              </Link>
            ) : (
              <>
                <Link
                  className="btn btn--primary"
                  to="/register"
                >
                  Create an account
                </Link>

                <Link
                  className="btn btn--secondary"
                  to="/login"
                >
                  Log in
                </Link>
              </>
            )}

          </div>
        </div>

        <BridgeIllustration />

      </section>


      {/* --upcominng eveents */}

      {events?.length > 0 && (
        <section className="landing__section">
          <h2>Coming up soon</h2>
          <div className="card-grid">
            {events.map((event) => (

              <EventCard
                key={event.id}
                event={event}
              />

            ))}

          </div>
        </section>

      )}

    </div>
  );
}