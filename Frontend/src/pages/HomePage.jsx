import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import BridgeIllustration from "@/components/common/BridgeIllustration";
import EventCard from "@/components/events/EventCard";
import { useApiData } from "@/hooks/useApiData";
import { useAuth } from "@/hooks/useAuth";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { searchEvents } from "@/api/eventsApi";
import { ROLE_HOME } from "@/config/constants";
import { SOCIAL_LINKS, CONTACT, TESTIMONIALS, COMMUNITY_VIDEOS, IMPACT_METRICS } from "@/config/homeContent";

const SUCCESS_STORIES = [
  {
  image: "/images/banners/cleaningImage.jpg",
  title: "Making Communities Greener",
  text: "Together, we can create cleaner and greener communities...",
  category: "Environment",
  },
  {
    image: "/images/banners/food_distribution.png",
    title: "Serving Our Communities",
    text: "Small acts of kindness help make food and essential support accessible to more people.",
    category: "Community Support",
  },
  {
    image: "/images/banners/book_dist.png",
    title: "Book Donation and Teaching",
    text: "A small act of kindness can make a big difference. Join initiatives that support underprivileged families and strengthen local communities.",
    category: "Community Support",
  },
  {
    image: "/images/banners/Unity_Flag.png",
    title: "Connecting People, Creating Impact",
    text: "SevaSetu bridges the gap between passionate volunteers and organizations working toward meaningful social change.",
    category: "Our Mission",
  },
  {
    image: "/images/banners/sevasetu.png",
    title: "About SevaSetu",
    text: "SevaSetu is a platform designed to make volunteering accessible, transparent, and rewarding by connecting people with opportunities to serve society.",
    category: "About Us",
  },
];


const COMMUNITY_ACTIVITIES = [
  {
    title: "A Sunday Spent Cleaning Our Neighbourhood",
    description:
      "Volunteers came together to collect plastic waste, clean the surroundings, and make the area a little greener.",
    image: "/images/banners/cleaningImage.jpg",
    label: "Cleanliness Drive",
    
  },
  {
    title: "Sharing Meals, Spreading Smiles",
    description:
      "A small group of volunteers distributed freshly prepared meals to people in need and spent time with the local community.",
    image: "/images/banners/food_distribution.png",
    label: "Food Distribution",
  
  },
  {
    title: "An Afternoon of Learning Together",
    description:
      "Volunteers spent the afternoon helping children with reading, writing, and basic schoolwork through fun learning activities.",
    image: "/images/banners/img1.jpeg",
    label: "Education",
  },
  {
    title: "A Step Towards Better Health",
    description:
      "A community health camp brought people together for basic health checkups and conversations about everyday health and hygiene.",
    image: "/images/banners/img2.jpeg",
    label: "Health Camp",
  },
  {
    title: "Small Efforts, Happy Faces",
    description:
      "Volunteers joined hands to help local families with essential supplies and spent a meaningful day connecting with the community.",
    image: "/images/banners/img3.jpeg",
    label: "Community Support",
  },
];

const EVENTS_PER_PAGE = 3;

const IMPACT_AREAS = [
  {
    title: "Food Distribution",
    image: "/images/impact_area_image/image1.jpeg",
    description: "Volunteers distributing meals and food packets to people in need.",
  },
  {
    title: "Tree plantation",
    image: "/images/impact_area_image/image2.jpeg",
    description: "Community members working together to plant trees and improve the environment",
  },
  {
    title: "Cleanliness campaign",
    image: "/images/impact_area_image/image3.jpeg",
    description: "Volunteers collecting plastic and waste to keep beaches and public spaces clean.",
  },
  {
    title: "Elderly care",
    image: "/images/impact_area_image/image4.jpeg",
    description: "Volunteers providing companionship, assistance, and support to senior citizens.",
  },
  {
    title: "Clothes donation",
    image: "/images/impact_area_image/image5.jpeg",
    description: "Collecting, sorting, and distributing clothes to families who need them.",
  },
  {
    title: "Digital Educator",
    image: "/images/impact_area_image/image6.jpeg",
    description: "Teaching basic computer skills and helping people gain access to digital technology.",
  },
  {
    title: "Animal Welfare",
    image: "/images/impact_area_image/image7.jpeg",
    description: "Helping shelters with feeding, cleaning, and caring for rescued animals.",
  },
  {
    title: "Beautification and wall painting",
    image: "/images/impact_area_image/image8.jpeg",
    description: "Volunteers improving schools and neighbourhoods through painting and renovation.",
  },
  {
    title: "Disaster relief",
    image: "/images/impact_area_image/image9.jpeg",
    description: "Organizing emergency supplies, relief kits, and assistance for communities affected by disasters.",
  },
  {
    title: "Awareness campaign",
    image: "/images/impact_area_image/image8.jpeg",
    description: "Volunteers spreading awareness about social issues, health, safety, or the environment.",
  },
];


function SocialIcon({ name }) {
  const paths = {
    Instagram: <><rect x="2.5" y="2.5" width="19" height="19" rx="5"/><circle cx="12" cy="12" r="4.1"/><circle cx="17.9" cy="6.3" r="1" fill="currentColor" stroke="none"/></>,
    Facebook: <path d="M14.5 21v-8h3l.5-4h-3.5V7c0-1.1.4-1.6 1.7-1.6H18V2.1c-.6-.1-1.8-.1-2.8-.1-3.2 0-5.1 1.8-5.1 5.2V9H7v4h3.1v8z" fill="currentColor" stroke="none"/>,
    LinkedIn: <><rect x="3" y="9" width="4" height="12" fill="currentColor" stroke="none"/><circle cx="5" cy="5" r="2" fill="currentColor" stroke="none"/><path d="M11 21V9h4v1.7c.7-1.2 2-2 3.5-2 2.6 0 3.5 1.7 3.5 4.4V21h-4v-7.1c0-1-.3-1.7-1.3-1.7S15 13 15 14v7z" fill="currentColor" stroke="none"/></>,
    X: <path d="M3 3h4.6l13.4 18h-4.6zM20.6 3 3.4 21"/>,
  };
  return <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function DragCarousel({ children, className = "", label }) {
  const sliderRef = useRef(null);
  const dragRef = useRef({ active: false, pointerId: null, startX: 0, startScroll: 0, moved: false });

  const onDown = (event) => {
    if (event.pointerType !== "mouse" || event.button !== 0) return;
    // Let video controls, links and embedded players handle their own clicks.
    if (event.target.closest("a, button, input, textarea, select, video, iframe")) return;
    const slider = sliderRef.current;
    if (!slider) return;
    dragRef.current = {
      active: true,
      pointerId: event.pointerId,
      startX: event.clientX,
      startScroll: slider.scrollLeft,
      moved: false,
    };
    slider.classList.add("is-dragging");
    slider.setPointerCapture(event.pointerId);
  };

  const onMove = (event) => {
    const drag = dragRef.current;
    if (!drag.active || event.pointerId !== drag.pointerId) return;
    const distance = event.clientX - drag.startX;
    if (Math.abs(distance) > 5) drag.moved = true;
    sliderRef.current.scrollLeft = drag.startScroll - distance;
  };

  const onEnd = (event) => {
    if (!dragRef.current.active || event.pointerId !== dragRef.current.pointerId) return;
    dragRef.current.active = false;
    sliderRef.current?.classList.remove("is-dragging");
  };

  const onClickCapture = (event) => {
    if (!dragRef.current.moved) return;
    event.preventDefault();
    event.stopPropagation();
    dragRef.current.moved = false;
  };

  return (
    <div
      ref={sliderRef}
      className={`drag-carousel ${className}`}
      role="region"
      aria-label={label}
      tabIndex={0}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onEnd}
      onPointerCancel={onEnd}
      onLostPointerCapture={onEnd}
      onClickCapture={onClickCapture}
    >
      {children}
    </div>
  );
}

function CommunityVoices() {
  // Accept both local MP4 files and valid YouTube embeds
  const videos = COMMUNITY_VIDEOS.filter(
    (video) =>
      video.mp4Src ||
      (video.youtubeEmbedUrl &&
        !video.youtubeEmbedUrl.includes("VIDEO_ID_"))
  );

  return (
    <section
      className="landing__section landing-voices"
      aria-labelledby="voices-heading"
    >
      <div className="landing-section-heading">
        <div>
          <span className="landing-eyebrow">COMMUNITY VOICES</span>
          <h2 id="voices-heading">Voices that inspire action</h2>
          <p className="muted">
            Stories from volunteers and videos from the community.
          </p>
        </div>
      </div>

      <div className="community-voices-grid">

        <div className="community-voices-panel">
          <h3>What our supporters say</h3>

          {TESTIMONIALS.length > 0 ? (
            <DragCarousel
              className="community-inner-slider"
              label="Browse volunteer testimonials"
            >
              {TESTIMONIALS.map((testimonial, index) => (
                <figure
                  className="community-inner-slide community-testimonial"
                  key={`${testimonial.name}-${index}`}
                >
                  <blockquote>
                    “{testimonial.quote}”
                  </blockquote>

                  <figcaption>
                    {testimonial.image && (
                      <img
                        src={testimonial.image}
                        alt=""
                        loading="lazy"
                        draggable={false}
                        onError={(event) => {
                          event.currentTarget.style.display = "none";
                        }}
                      />
                    )}

                    <span>
                      <strong>{testimonial.name}</strong>
                      <small>{testimonial.role}</small>
                    </span>
                  </figcaption>
                </figure>
              ))}
            </DragCarousel>
          ) : (
            <div className="landing-voices__empty">
              <strong>Volunteer stories coming soon</strong>
            </div>
          )}
        </div>

  
        <div className="community-voices-panel">
          <h3>Community & promotional videos</h3>

          {videos.length > 0 ? (
            <DragCarousel
              className="community-inner-slider"
              label="Browse community videos"
            >
              {videos.map((video, index) => (
                <article
                  className="community-inner-slide community-video"
                  key={`${video.title}-${index}`}
                >
                  <div className="community-video__player">

                    {/* Local video takes priority */}
                    {video.mp4Src ? (
                      <video
                        controls
                        playsInline
                        preload="metadata"
                        poster={video.poster || undefined}
                      >
                        <source
                          src={video.mp4Src}
                          type="video/mp4"
                        />
                        Your browser does not support video playback.
                      </video>
                    ) : (
                      <iframe
                        src={video.youtubeEmbedUrl}
                        title={video.title}
                        loading="lazy"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        referrerPolicy="strict-origin-when-cross-origin"
                        allowFullScreen
                      />
                    )}

                  </div>

                  <strong>{video.title}</strong>
                  <p>{video.description}</p>
                </article>
              ))}
            </DragCarousel>
          ) : (
            <div className="landing-video-placeholder" role="status">
              <span
                className="landing-video-placeholder__play"
                aria-hidden="true"
              >
                ▶
              </span>

              <strong>Community videos coming soon</strong>
              <span>
                Add local MP4 files or YouTube videos in homeContent.js.
              </span>
            </div>
          )}
        </div>

      </div>
    </section>
  );
}

function ImpactNumbers() {
  const hasApproximate = IMPACT_METRICS.some(m => m.value !== null && m.approximate);
  const hasUnpublished = IMPACT_METRICS.some(m => m.value === null);
  return (
    <section className="landing__section landing-metrics" aria-labelledby="metrics-heading">
      <div className="landing-section-heading">
        <div>
          <span className="landing-eyebrow">OUR GROWING COMMUNITY</span>
          <h2 id="metrics-heading">SevaSetu in numbers</h2>
          <p className="muted">Community milestones, updated as our impact is documented.</p>
        </div>
      </div>
      <div className="landing-metrics__grid">
        {IMPACT_METRICS.map(({ label, value, approximate, icon }) => (
          <article className="landing-metric" key={label}>
            <span className="landing-metric__icon" aria-hidden="true">{icon}</span>
            <strong className="landing-metric__value">{value === null ? '—' : `${approximate ? '~' : ''}${Number(value).toLocaleString('en-IN')}`}</strong>
            <span className="landing-metric__label">{label}</span>
            {value === null && <small>Data coming soon</small>}
          </article>
        ))}
      </div>
      {(hasApproximate || hasUnpublished) && <p className="landing-metrics__note">{hasApproximate ? 'Figures marked ~ are estimates. ' : ''}{hasUnpublished ? 'Unpublished figures are shown as —, not zero.' : ''}</p>}
    </section>
  );
}

export default function HomePage() {
  const { isAuthenticated, user } = useAuth();

  useDocumentTitle("");

  const { data: events, loading: eventsLoading, error: eventsError, reload: reloadEvents } = useApiData(
    () => searchEvents({ sort: "date" }),
    []
  );
  const [eventPage, setEventPage] = useState(1);
  const eventList = Array.isArray(events) ? events : [];
  const eventPageCount = Math.max(1, Math.ceil(eventList.length / EVENTS_PER_PAGE));
  const visibleEvents = eventList.slice(
    (eventPage - 1) * EVENTS_PER_PAGE,
    eventPage * EVENTS_PER_PAGE
  );

  const goToEventPage = (page) => {
    setEventPage(Math.min(Math.max(page, 1), eventPageCount));
  };

  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide(
        (prev) => (prev + 1) % SUCCESS_STORIES.length
      );
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const nextSlide = () => {
    setCurrentSlide(
      (prev) => (prev + 1) % SUCCESS_STORIES.length
    );
  };

  const prevSlide = () => {
    setCurrentSlide(
      (prev) =>
        (prev - 1 + SUCCESS_STORIES.length) %
        SUCCESS_STORIES.length
    );
  };

  const impactSliderRef = useRef(null);

  const impactDragRef = useRef({
    isDragging: false,
    startX: 0,
    startScrollLeft: 0,
  });

  const handleImpactDragStart = (e) => {
  
    if (e.pointerType !== "mouse" || e.button !== 0) return;

    const slider = impactSliderRef.current;
    if (!slider) return;

    impactDragRef.current = {
      isDragging: true,
      startX: e.clientX,
      startScrollLeft: slider.scrollLeft,
    };

    slider.classList.add("is-dragging");
    slider.setPointerCapture(e.pointerId);
  };

  const handleImpactDragMove = (e) => {
    if (!impactDragRef.current.isDragging) return;

    const slider = impactSliderRef.current;
    if (!slider) return;

    const distance = e.clientX - impactDragRef.current.startX;

    slider.scrollLeft =
      impactDragRef.current.startScrollLeft - distance;
  };

  const handleImpactDragEnd = () => {
    impactDragRef.current.isDragging = false;
    impactSliderRef.current?.classList.remove("is-dragging");
  };

  const scrollImpact = (direction) => {
    const slider = impactSliderRef.current;
    if (!slider) return;

    const card = slider.querySelector(".landing-impact-card");
    if (!card) return;

    const gap = parseFloat(getComputedStyle(slider).gap) || 0;

    slider.scrollBy({
      left: direction * (card.getBoundingClientRect().width + gap),
      behavior: "smooth",
    });
  };

  return (
    <div className="stack landing">

      <section className="landing__section">

        <h2>Every Act of Kindness Matters</h2>

        <p className="muted">
          Discover inspiring stories of compassion, community, and the power of coming together.
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
                {story.image ? (
                  <img
                    src={story.image}
                    alt={story.title}
                    className="banner-full-image"
                  />
                ) : (
                  <div className="banner-slide__placeholder" aria-hidden="true" />
                )}

                <div className="banner-overlay">
                  <span className="banner-category">
                    {story.category}
                  </span>

                  <h2>{story.title}</h2>

                  <p>{story.text}</p>
                </div>
              </div>
            ))}

            

          </div>

          <button
            type="button"
            className="banner-arrow banner-arrow--left"
            onClick={prevSlide}
            aria-label="Previous story"
          >
            &#10094;
          </button>

          <button
            type="button"
            className="banner-arrow banner-arrow--right"
            onClick={nextSlide}
            aria-label="Next story"
          >
            &#10095;
          </button>

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

        <img
          src="/images/hero/community-support.jpeg"
          alt="Hands holding a circle of people, representing unity and volunteering"
          className="hero__image"
        />

      </section>

      <section className="landing__section" id="opportunities">
        <div className="landing-section-heading">
          <div>
            <span className="landing-eyebrow">FIND YOUR NEXT OPPORTUNITY</span>
            <h2>Upcoming volunteering opportunities</h2>
            <p className="muted">Discover real events organised by communities near you.</p>
          </div>
          <Link className="btn btn--secondary" to={isAuthenticated ? "/app/opportunities" : "/register"}>
            {isAuthenticated ? "Explore all opportunities" : "Join to explore"} →
          </Link>
        </div>
        {eventsLoading ? (
          <div className="landing-empty-state" role="status">Loading volunteering opportunities…</div>
        ) : eventsError ? (
          <div className="landing-empty-state" role="alert">
            <div>
              <h3>Couldn't load opportunities</h3>
              <p className="muted">Please check your connection and try again.</p>
              <button type="button" className="btn btn--secondary" onClick={() => reloadEvents()}>Retry</button>
            </div>
          </div>
        ) : eventList.length > 0 ? (
          <>
            <div className="card-grid landing-opportunities-grid" aria-live="polite" aria-atomic="false">
              {visibleEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
            {eventPageCount > 1 && (
              <nav className="landing-events-pagination" aria-label="Volunteering events pages">
                <span className="landing-events-pagination__status">
                  Showing {(eventPage - 1) * EVENTS_PER_PAGE + 1}–{Math.min(eventPage * EVENTS_PER_PAGE, eventList.length)} of {eventList.length} events
                </span>
                <div className="landing-events-pagination__buttons">
                  <button type="button" className="landing-events-pagination__button" disabled={eventPage === 1} onClick={() => goToEventPage(eventPage - 1)} aria-label="Previous event page">‹ Previous</button>
                  {Array.from({ length: eventPageCount }, (_, index) => index + 1)
                    .filter((page) => page === 1 || page === eventPageCount || Math.abs(page - eventPage) <= 1)
                    .reduce((pages, page) => {
                      if (pages.length && page - pages[pages.length - 1] > 1) pages.push("gap-" + page);
                      pages.push(page);
                      return pages;
                    }, [])
                    .map((page) => typeof page === "string" ? (
                      <span className="landing-events-pagination__ellipsis" key={page} aria-hidden="true">…</span>
                    ) : (
                      <button
                        type="button"
                        key={page}
                        className={`landing-events-pagination__button ${page === eventPage ? "is-active" : ""}`}
                        onClick={() => goToEventPage(page)}
                        aria-label={`Event page ${page}`}
                        aria-current={page === eventPage ? "page" : undefined}
                      >{page}</button>
                    ))}
                  <button type="button" className="landing-events-pagination__button" disabled={eventPage === eventPageCount} onClick={() => goToEventPage(eventPage + 1)} aria-label="Next event page">Next ›</button>
                </div>
              </nav>
            )}
          </>
        ) : (
          <div className="landing-empty-state">
            <span aria-hidden="true">📅</span>
            <div>
              <h3>New opportunities are on the way</h3>
              <p className="muted">Check back for upcoming volunteer events and community initiatives.</p>
            </div>
          </div>
        )}
      </section>

      <CommunityVoices />

      <section className="landing-feature-band" aria-labelledby="activities-heading">
        <div className="landing-band-inner">
          <div className="landing-section-heading">
            <div>
              <span className="landing-eyebrow">MAKE A DIFFERENCE</span>
              <h2 id="activities-heading">Recent Activities</h2>
              <p className="muted">Discover the kinds of initiatives you can support with SevaSetu.</p>
            </div>
          </div>
          <DragCarousel className="activities-drag-carousel" label="Community activities and causes">
            {COMMUNITY_ACTIVITIES.map((activity) => (
              <article className="landing-activity-card" key={activity.title}>
                <div className="landing-activity-card__media">
                  {activity.image ? (
                    <img src={activity.image} alt="" loading="lazy" />
                  ) : (
                    <span aria-hidden="true">{activity.icon}</span>
                  )}
                </div>
                <div className="landing-activity-card__body">
                  <span className="landing-activity-card__label">{activity.label}</span>
                  <h3>{activity.title}</h3>
                  <p>{activity.description}</p>
                </div>
              </article>
            ))}
          </DragCarousel>
        </div>
      </section>

      <section
        className="landing__section"
        aria-labelledby="areas-heading"
      >
        <div className="landing-section-heading">
          <div>
            <span className="landing-eyebrow">
              WHERE YOU CAN HELP
            </span>

            <h2 id="areas-heading">Events that could be Oraganized !</h2>

            <p className="muted">
              Find a cause that matches what matters to you.
            </p>
          </div>
        </div>

        <div
          className="impact-slider"
          ref={impactSliderRef}
          aria-label="Impact areas"
          onPointerDown={handleImpactDragStart}
          onPointerMove={handleImpactDragMove}
          onPointerUp={handleImpactDragEnd}
          onPointerCancel={handleImpactDragEnd}
          onLostPointerCapture={handleImpactDragEnd}
        >
          {IMPACT_AREAS.map((area) => (
            <article
              className="landing-impact-card"
              key={area.title}
            >
              <div className="landing-impact-card__visual">
                {area.image ? (
                  <img
                    src={area.image}
                    alt={area.title}
                    className="landing-impact-card__image"
                    loading="lazy"
                    draggable={false}
                  />
                ) : (
                  <span aria-hidden="true">{area.icon }</span>
                )}
              </div>
              <div className="landing-impact-card__body">
                <h3>{area.title}</h3>
                <p>{area.description}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="landing__section">
        <div className="landing-cta">
          <div>
            <span className="landing-eyebrow">BE PART OF THE CHANGE</span>
            <h2>Small acts. Stronger communities.</h2>
            <p>Give your time, share your skills and help create a lasting impact.</p>
          </div>
          <Link className="btn landing-cta__button" to={isAuthenticated ? "/app/opportunities" : "/register"}>
            {isAuthenticated ? "Find an opportunity" : "Get involved"} →
          </Link>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="landing-footer__inner">
          <div className="landing-footer__about">
            <h2>SevaSetu</h2>
            <p>Connecting people who care with causes that matter.</p>
            <h3 className="landing-footer__follow">Connect with us</h3>
            <div className="landing-footer__socials" aria-label="Social platforms">
              {SOCIAL_LINKS.map(({ name, url, isOfficial }) => (
                <a key={name} href={url} target="_blank" rel="noopener noreferrer"
                  aria-label={`${name} — ${isOfficial ? 'SevaSetu profile' : 'platform homepage'} (opens in a new tab)`}
                  title={`${name} — ${isOfficial ? 'SevaSetu profile' : 'platform homepage'}`}>
                  <SocialIcon name={name} />
                </a>
              ))}
            </div>
            {SOCIAL_LINKS.some(link => !link.isOfficial) && (
              <small className="landing-footer__social-note">Official SevaSetu social profiles will be linked here when available.</small>
            )}
          </div>
          <div className="landing-footer__column">
            <h3>Explore</h3>
            <a href="#opportunities">Volunteering opportunities</a>
            <a href="#voices-heading">Community voices</a>
            <a href="#activities-heading">Community activities</a>
            <a href="#areas-heading">Impact areas</a>
          </div>
          <div className="landing-footer__column">
            <h3>Get started</h3>
            <Link to={isAuthenticated ? "/app" : "/register"}>
              {isAuthenticated ? "My dashboard" : "Create an account"}
            </Link>
            {!isAuthenticated && <Link to="/login">Log in</Link>}
          </div>
          <div className="landing-footer__column">
            <h3>Contact & support</h3>
            <p>Have a question or facing an issue? We’re here to help.</p>
            {CONTACT.email && <a href={`mailto:${CONTACT.email}`}>✉ {CONTACT.email}</a>}
            {CONTACT.phone && <a href={`tel:${CONTACT.phone.replace(/[^+\d]/g, "")}`}>☎ {CONTACT.phone}</a>}
            {CONTACT.location && <span>{CONTACT.location}</span>}
            {!CONTACT.email && !CONTACT.phone && <span className="landing-footer__contact-pending">Support contact details will be available soon.</span>}
          </div>
        </div>
        <div className="landing-footer__bottom">© {new Date().getFullYear()} SevaSetu · Together, we make a difference.</div>
      </footer>

    </div>
  );
}