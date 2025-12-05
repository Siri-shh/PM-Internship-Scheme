// client/src/pages/HomePage.tsx
import React, { useEffect, useRef, useState } from "react";
import { Header } from "@/components/Header";
import { StatsBar } from "@/components/StatsBar";
// IndiaMap intentionally removed
import { SuccessStories } from "@/components/SuccessStories";
import { NotificationTicker } from "@/components/NotificationTicker";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, GraduationCap, Building2, Shield, Sparkles } from "lucide-react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/AuthProvider";

const IMAGE_CREDITS = [
  { imgUrl: "/images/meow.png", content: "Teamwork & collaboration" },
  { imgUrl: "/images/office.jpeg", content: "Interns working at an office centre" },
  { imgUrl: "/images/modi.jpg", content: "Hon’ble Prime Minister Narendra Modi addressing youth" },
  { imgUrl: "/images/chart.jpg", content: "Economic growth- India's rising opportunities" },
  { imgUrl: "/images/students.jpg", content: "Young Indian students preparing for internships" },
];

// ------------------------
// ImageCarousel component
// (adapted from user-provided Card code; renamed to avoid export conflicts)
// ------------------------
interface CardData {
  id: number;
  imgUrl: string;
  content: string;
}

interface CarouselProps {
  data: CardData[];
  showCarousel?: boolean;
  cardsPerView?: number;
}

const ImageCarousel = ({ data, showCarousel = true, cardsPerView = 3 }: CarouselProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSingleCard, setIsSingleCard] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setIsSingleCard(data?.length === 1);
  }, [data]);

  // AUTO-ROTATE
  useEffect(() => {
    if (!showCarousel || data.length <= cardsPerView) return;

    let interval = setInterval(() => {
      nextSlide();
    }, 3000); // 3 seconds — change to whatever you like

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, data, showCarousel, cardsPerView]);

  // Calculate width percentage for each card based on cardsPerView
  const cardWidth = 75 / cardsPerView;

  const nextSlide = () => {
    if (isAnimating || !showCarousel || !data) return;
    if (data.length <= cardsPerView) return;

    setIsAnimating(true);
    const nextIndex = (currentIndex + 1) % data.length;

    if (containerRef.current) {
      containerRef.current.style.transition = "transform 500ms ease";
      containerRef.current.style.transform = `translateX(-${cardWidth}%)`;

      setTimeout(() => {
        setCurrentIndex(nextIndex);
        if (containerRef.current) {
          containerRef.current.style.transition = "none";
          containerRef.current.style.transform = "translateX(0)";
          // Force reflow
          void containerRef.current.offsetWidth;
          setIsAnimating(false);
        }
      }, 500);
    }
  };

  const prevSlide = () => {
    if (isAnimating || !showCarousel || !data) return;
    if (data.length <= cardsPerView) return;

    setIsAnimating(true);
    const prevIndex = (currentIndex - 1 + data.length) % data.length;

    if (containerRef.current) {
      // First move instantly to the right position
      containerRef.current.style.transition = "none";
      containerRef.current.style.transform = `translateX(-${cardWidth}%)`;

      // Update the index immediately
      setCurrentIndex(prevIndex);

      // Force reflow
      void containerRef.current.offsetWidth;

      // Then animate back to center
      containerRef.current.style.transition = "transform 500ms ease";
      containerRef.current.style.transform = "translateX(0)";

      setTimeout(() => {
        setIsAnimating(false);
      }, 500);
    }
  };

  // Calculate which cards to show
  const getVisibleCards = () => {
    if (!showCarousel || !data) return data || [];

    const visibleCards: CardData[] = [];
    const totalCards = data.length;

    // For next slide animation, we need current cards + 1 extra
    for (let i = 0; i < cardsPerView + 1; i++) {
      const index = (currentIndex + i) % totalCards;
      visibleCards.push(data[index]);
    }

    return visibleCards;
  };

  if (!data || data.length === 0) {
    return <div>No card data available</div>;
  }

  return (
    <div className="w-full px-4" onMouseEnter={() => setIsAnimating(true)} onMouseLeave={() => setIsAnimating(false)}>
      <div className={`relative ${isSingleCard ? "max-w-sm mx-auto" : "w-full"}`}>
        {/* Carousel Controls */}
        {showCarousel && data.length > cardsPerView && (
          <>
            <button
              onClick={prevSlide}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-all duration-300"
              disabled={isAnimating}
              aria-label="Previous slide"
            >
              &lt;
            </button>
            <button
              onClick={nextSlide}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-all duration-300"
              disabled={isAnimating}
              aria-label="Next slide"
            >
              &gt;
            </button>
          </>
        )}

        {/* Cards Container Wrapper - limits visible area */}
        <div className="overflow-hidden">
          {/* Sliding Cards Container */}
          <div
            ref={containerRef as any}
            className="flex"
            style={{
              transform: "translateX(0)",
              width: showCarousel ? `${(cardsPerView + 1) * 100 / cardsPerView}%` : "100%",
            }}
          >
            {getVisibleCards().map((card, idx) => (
              <div
                key={`card-${currentIndex}-${idx}`}
                style={{
                  width: showCarousel ? `${100 / (cardsPerView + 1)}%` : `${100 / Math.min(cardsPerView, data.length)}%`,
                }}
                className="px-2"
              >
                <div className="relative overflow-hidden rounded-lg shadow-md group h-full">
                  <div className="w-full h-64">
                    <img src={card.imgUrl} alt={card.content} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                  </div>
                  <div className="absolute inset-0 bg-black/80 text-white p-4 transition-transform duration-300 transform translate-y-full group-hover:translate-y-0 overflow-y-auto">
                    <p className="text-sm">{card.content}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ------------------------
// HomePage component
// ------------------------
export default function HomePage(): JSX.Element {
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();

  const [hoverStar, setHoverStar] = useState<{ id: string; label: string; youth?: string } | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  function enterPortal(key: "student" | "company" | "admin", path: string) {
    try {
      // Always update the portal selection to allow switching
      sessionStorage.setItem("portalSelected", key);
    } catch (e) {
      console.warn("enterPortal/sessionStorage error:", e);
    }
    setLocation(path);
  }

  // Indian States Constellation with Real Employable Youth Data (Ages 21-24)
  // Data source: Estimated based on Census projections and NSSO employment surveys
  const CONSTELLATION = [
    { id: "UP", x: 15, y: 10, label: "Uttar Pradesh", youth: "8.2M" },
    { id: "MH", x: 25, y: 18, label: "Maharashtra", youth: "4.5M" },
    { id: "BR", x: 35, y: 8, label: "Bihar", youth: "4.8M" },
    { id: "WB", x: 45, y: 12, label: "West Bengal", youth: "3.6M" },
    { id: "MP", x: 20, y: 15, label: "Madhya Pradesh", youth: "3.2M" },
    { id: "TN", x: 30, y: 22, label: "Tamil Nadu", youth: "2.8M" },
    { id: "RJ", x: 10, y: 12, label: "Rajasthan", youth: "2.9M" },
    { id: "KA", x: 28, y: 20, label: "Karnataka", youth: "2.5M" },
    { id: "GJ", x: 12, y: 16, label: "Gujarat", youth: "2.4M" },
    { id: "AP", x: 33, y: 20, label: "Andhra Pradesh", youth: "2.0M" },
    { id: "OR", x: 40, y: 14, label: "Odisha", youth: "1.8M" },
    { id: "TG", x: 32, y: 18, label: "Telangana", youth: "1.5M" },
    { id: "KL", x: 26, y: 24, label: "Kerala", youth: "1.2M" },
    { id: "JH", x: 38, y: 11, label: "Jharkhand", youth: "1.4M" },
    { id: "AS", x: 48, y: 10, label: "Assam", youth: "1.3M" },
    { id: "PB", x: 8, y: 8, label: "Punjab", youth: "1.1M" },
    { id: "CT", x: 36, y: 16, label: "Chhattisgarh", youth: "1.0M" },
    { id: "HR", x: 12, y: 10, label: "Haryana", youth: "1.0M" },
    { id: "DL", x: 13, y: 9, label: "Delhi", youth: "0.8M" },
    { id: "JK", x: 6, y: 6, label: "Jammu & Kashmir", youth: "0.5M" },
  ];

  // tooltip and small event handlers
  useEffect(() => {
    const tooltipEl = document.getElementById("const-tooltip") as HTMLDivElement | null;
    function showHandler(e: any) {
      const { id, label, youth, x, y } = e.detail;
      setHoverStar({ id, label, youth });
      setTooltipPos({ x, y });
      if (tooltipEl) tooltipEl.classList.remove("opacity-0", "pointer-events-none");
    }
    function hideHandler() {
      setHoverStar(null);
      setTooltipPos(null);
      if (tooltipEl) tooltipEl.classList.add("opacity-0", "pointer-events-none");
    }
    function marqueeHandler(e: any) {
      // noop: kept for compatibility if other parts dispatch marquee-pause
    }

    window.addEventListener("const-tooltip-show", showHandler as EventListener);
    window.addEventListener("const-tooltip-hide", hideHandler as EventListener);
    window.addEventListener("marquee-pause", marqueeHandler as EventListener);

    return () => {
      window.removeEventListener("const-tooltip-show", showHandler as EventListener);
      window.removeEventListener("const-tooltip-hide", hideHandler as EventListener);
      window.removeEventListener("marquee-pause", marqueeHandler as EventListener);
    };
  }, []);

  // dispatch helper used by inline SVG event handlers
  function dispatchTooltipShow(e: React.MouseEvent, p: { id: string; label: string; youth?: string }) {
    const rect = (e.target as HTMLElement).closest("svg")?.getBoundingClientRect();
    if (!rect) return;
    const x = (e as any).clientX - rect.left;
    const y = (e as any).clientY - rect.top;
    window.dispatchEvent(new CustomEvent("const-tooltip-show", { detail: { id: p.id, label: p.label, youth: p.youth, x, y } }));
  }
  function dispatchTooltipHide() {
    window.dispatchEvent(new CustomEvent("const-tooltip-hide"));
  }

  // map IMAGE_CREDITS to CardData format
  const carouselData: CardData[] = IMAGE_CREDITS.map((it, idx) => ({
    id: idx + 1,
    imgUrl: it.imgUrl,
    content: it.content,
  }));

  return (
    <div className="min-h-screen pb-12 relative">
      {/* Background gradient layer – full bleed behind everything */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-purple-950 dark:to-blue-900" />

      <Header />

      <section className="py-12 md:py-20 relative z-10">
        <div className="container mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Sparkles className="h-4 w-4" />
              AI-Powered Internship Matching
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
              Launch Your Career with <span className="text-primary">PM Internship Scheme</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              India's largest AI-powered internship allocation platform connecting talented students with top companies across the nation
            </p>
          </motion.div>
        </div>
      </section>

      <StatsBar />

      <section className="py-16 relative z-10">
        <div className="container mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Internships Across India</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">Explore opportunities in major cities and emerging tech hubs nationwide</p>
          </motion.div>

          {/* ---------------------------
              REPLACEMENT: compact horizontal constellation + ImageCarousel
             --------------------------- */}
          <div className="space-y-6">
            {/* Constellation */}
            <motion.div initial={{ opacity: 0, y: 6 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <div className="rounded-2xl border bg-card/50 backdrop-blur-sm p-6 shadow-lg">
                <div className="w-full overflow-hidden relative flex justify-center items-center min-h-[300px]">
                  <svg viewBox="0 0 50 26" preserveAspectRatio="xMidYMid meet" className="w-full max-w-4xl h-64 md:h-80">
                    <defs>
                      {/* Gradients for light and dark mode compatibility */}
                      <radialGradient id="star-glow">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.8" />
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
                      </radialGradient>

                      <filter id="star-glow-filter" x="-200%" y="-200%" width="400%" height="400%">
                        <feGaussianBlur stdDeviation="0.8" result="coloredBlur" />
                        <feMerge>
                          <feMergeNode in="coloredBlur" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>

                      <filter id="strong-glow" x="-300%" y="-300%" width="600%" height="600%">
                        <feGaussianBlur stdDeviation="1.5" result="coloredBlur" />
                        <feMerge>
                          <feMergeNode in="coloredBlur" />
                          <feMergeNode in="coloredBlur" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                    </defs>

                    {/* Background subtle gradient */}
                    <rect x="0" y="0" width="50" height="26" fill="url(#star-glow)" opacity="0.03" rx="2" />

                    {/* Beautiful wavy connecting path */}
                    <path
                      d="M 6 13 Q 12 8, 15 10 T 25 18 T 35 8 T 45 12 Q 48 10, 50 13"
                      fill="none"
                      stroke="hsl(var(--primary))"
                      strokeWidth="0.15"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      opacity="0.25"
                      className="wavy-path"
                    />

                    {/* State stars */}
                    {CONSTELLATION.map((state) => (
                      <g
                        key={state.id}
                        className="cursor-pointer transition-all duration-300 hover:scale-110"
                        transform={`translate(${state.x}, ${state.y})`}
                        onMouseEnter={(e) => dispatchTooltipShow(e, state)}
                        onMouseMove={(e) => dispatchTooltipShow(e, state)}
                        onMouseLeave={dispatchTooltipHide}
                        onClick={() => {
                          console.log("State clicked:", state.label, state.youth);
                        }}
                        role="button"
                        tabIndex={0}
                        aria-label={`${state.label}: ${state.youth} employable youth`}
                      >
                        {/* Outer glow ring - pulsing */}
                        <circle
                          r="1.2"
                          fill="url(#star-glow)"
                          opacity="0.6"
                          className="star-pulse"
                        />

                        {/* Middle glow */}
                        <circle
                          r="0.6"
                          fill="hsl(var(--primary))"
                          opacity="0.4"
                          filter="url(#star-glow-filter)"
                        />

                        {/* Core star */}
                        <circle
                          r="0.3"
                          fill="hsl(var(--primary))"
                          filter="url(#strong-glow)"
                          className="star-core"
                        />

                        {/* Sparkle effect */}
                        <g className="star-sparkle" opacity="0.8">
                          <line x1="-0.5" y1="0" x2="0.5" y2="0" stroke="hsl(var(--primary-foreground))" strokeWidth="0.08" />
                          <line x1="0" y1="-0.5" x2="0" y2="0.5" stroke="hsl(var(--primary-foreground))" strokeWidth="0.08" />
                        </g>

                        {/* Animated ring */}
                        <circle
                          r="1.5"
                          fill="none"
                          stroke="hsl(var(--primary))"
                          strokeWidth="0.05"
                          strokeOpacity="0.3"
                          className="star-ring"
                        />
                      </g>
                    ))}
                  </svg>

                  {/* Tooltip (absolute overlay inside the same container) */}
                  <div
                    id="const-tooltip"
                    className="pointer-events-none absolute z-30 opacity-0 transition-opacity duration-150 translate-y-[-8px] pointer-events-none"
                    style={{
                      left: tooltipPos ? `${tooltipPos.x}px` : undefined,
                      top: tooltipPos ? `${tooltipPos.y - 22}px` : undefined,
                      transform: tooltipPos ? "translate(-50%, -100%)" : undefined,
                    }}
                  >
                    <div className="rounded-md bg-foreground/95 px-4 py-2 text-xs font-medium text-background shadow-lg">
                      <div className="font-semibold">{hoverStar?.label ?? ""}</div>
                      {hoverStar?.youth && (
                        <div className="text-[10px] opacity-90 mt-0.5">Employable Youth (21-24): {hoverStar.youth}</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* ImageCarousel inserted here */}
            <motion.div id="image-carousel-section" initial={{ opacity: 0, y: 6 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <div className="mt-4 overflow-hidden rounded-xl border bg-card/50 backdrop-blur-sm py-6 shadow">
                <ImageCarousel data={carouselData} showCarousel={true} cardsPerView={3} />
              </div>
            </motion.div>
          </div>
          {/* ---------------------------
              END constellation + ImageCarousel
             --------------------------- */}
        </div>
      </section>

      <section className="py-16 relative z-10">
        <div className="container mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">How It Works</h2>
            <p className="text-muted-foreground">Simple steps to your dream internship</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                step: "01",
                title: "Register & Verify",
                description: "Create your profile and verify your identity through DigiLocker",
                icon: GraduationCap,
              },
              {
                step: "02",
                title: "AI Matching",
                description: "Our AI analyzes your skills and preferences to find perfect matches",
                icon: Sparkles,
              },
              {
                step: "03",
                title: "Get Placed",
                description: "Companies review your profile and extend offers for internships",
                icon: Building2,
              },
            ].map((item, index) => (
              <motion.div key={item.step} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.1 }}>
                <Card className="h-full hover-elevate text-center" data-testid={`card-step-${item.step}`}>
                  <CardContent className="p-8">
                    <div className="text-5xl font-bold text-primary/20 mb-4">{item.step}</div>
                    <div className="p-4 rounded-full bg-primary/10 w-fit mx-auto mb-4">
                      <item.icon className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                    <p className="text-muted-foreground">{item.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <SuccessStories />

      <section id="portals-section" className="py-16 relative z-10">
        <div className="container mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Choose Your Portal</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">Select the appropriate portal to get started with the PM Internship Scheme</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <Card onClick={() => enterPortal("student", "/student")} className="h-full hover-elevate group cursor-pointer" data-testid="card-student-portal" aria-label="Enter Student Portal">
                <CardContent className="p-6">
                  <div className="p-4 rounded-lg bg-blue-100 dark:bg-blue-900 w-fit mb-4 group-hover:scale-105 transition-transform">
                    <GraduationCap className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Student Portal</h3>
                  <p className="text-muted-foreground mb-4">Register, build your profile, and discover internships matched to your skills</p>
                  <Button variant="ghost" className="gap-2 p-0 h-auto">
                    Get Started <ArrowRight className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}>
              <Card onClick={() => enterPortal("company", "/company")} className="h-full hover-elevate group cursor-pointer" data-testid="card-company-portal" aria-label="Enter Company Portal">
                <CardContent className="p-6">
                  <div className="p-4 rounded-lg bg-purple-100 dark:bg-purple-900 w-fit mb-4 group-hover:scale-105 transition-transform">
                    <Building2 className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Company Portal</h3>
                  <p className="text-muted-foreground mb-4">Post roles, review AI-shortlisted candidates, and manage your intern pipeline</p>
                  <Button variant="ghost" className="gap-2 p-0 h-auto">
                    Register Company <ArrowRight className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }}>
              <Card onClick={() => enterPortal("admin", "/admin")} className="h-full hover-elevate group cursor-pointer" data-testid="card-admin-portal" aria-label="Enter Admin Portal">
                <CardContent className="p-6">
                  <div className="p-4 rounded-lg bg-green-100 dark:bg-green-900 w-fit mb-4 group-hover:scale-105 transition-transform">
                    <Shield className="h-8 w-8 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Admin Portal</h3>
                  <p className="text-muted-foreground mb-4">Government oversight dashboard for monitoring and policy management</p>
                  <Button variant="ghost" className="gap-2 p-0 h-auto">
                    Admin Access <ArrowRight className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Mobile App Download Section */}
      <section id="mobile-app-section" className="py-16 relative z-10">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="grid md:grid-cols-2 gap-12 items-center"
          >
            {/* Left Content */}
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Download PMIS Mobile Application
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Stay connected and manage your internship on the go with our official mobile application. Track applications, receive notifications, and access resources anytime, anywhere.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 items-start">
                <a
                  href="https://play.google.com/store/apps/details?id=com.mca.pm_internship"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg hover:bg-primary/90 transition-colors font-semibold"
                >
                  Get it on Google Play
                </a>
                <div className="flex flex-col items-center">
                  <p className="text-sm text-muted-foreground mb-2">Scan to Download</p>
                  <img
                    src="/images/qr-code-play-store.png"
                    alt="Download QR Code"
                    className="w-32 h-32 rounded-lg border-2 border-border"
                  />
                </div>
              </div>
            </div>

            {/* Right - Phone Mockups */}
            <div className="relative flex justify-center">
              <img
                src="/images/download-pmis-prototype.png"
                alt="PMIS Mobile App Screenshots"
                className="w-full max-w-lg"
              />
            </div>
          </motion.div>
        </div>
      </section>

      <NotificationTicker />

      {/* Footer */}
      <Footer />

      {/* Local styles for constellation stars + carousel */}
      <style jsx>{`
        /* Star animations */
        .star-pulse {
          animation: star-pulse 3s ease-in-out infinite;
        }

        .star-ring {
          animation: star-ring-rotate 8s linear infinite;
          transform-origin: center;
        }

        .star-sparkle {
          animation: star-twinkle 2s ease-in-out infinite;
        }

        .star-core {
          animation: star-breathe 2s ease-in-out infinite;
        }

        @keyframes star-pulse {
          0%, 100% {
            opacity: 0.4;
            transform: scale(1);
          }
          50% {
            opacity: 0.8;
            transform: scale(1.2);
          }
        }

        @keyframes star-ring-rotate {
          0% {
            transform: rotate(0deg) scale(1);
            opacity: 0.2;
          }
          50% {
            transform: rotate(180deg) scale(1.1);
            opacity: 0.4;
          }
          100% {
            transform: rotate(360deg) scale(1);
            opacity: 0.2;
          }
        }

        @keyframes star-twinkle {
          0%, 100% {
            opacity: 0.6;
          }
          50% {
            opacity: 1;
          }
        }

        @keyframes star-breathe {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.15);
            opacity: 0.9;
          }
        }

        /* Wavy path animation */
        .wavy-path {
          animation: wavy-pulse 4s ease-in-out infinite;
        }

        @keyframes wavy-pulse {
          0%, 100% {
            opacity: 0.2;
            stroke-width: 0.15;
          }
          50% {
            opacity: 0.35;
            stroke-width: 0.18;
          }
        }

        /* Carousel wrapper helper */
        .marquee {
          display: inline-block;
          animation: marquee 20s linear infinite;
        }
        
        @keyframes marquee {
          0% {
            transform: translateX(0%);
          }
          100% {
            transform: translateX(-50%);
          }
        }

        @media (max-width: 768px) {
          .marquee {
            animation-duration: 26s;
          }
        }
      `}</style>
    </div>
  );
}
