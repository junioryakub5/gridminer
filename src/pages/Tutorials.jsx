import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

const spinnerStyle = `
@keyframes tut-spin { to { transform: rotate(360deg); } }
@keyframes tut-pulse { 0%,100% { opacity:0.4; transform:scale(1); } 50% { opacity:1; transform:scale(1.08); } }
.tut-spinner-ring {
  width:52px;height:52px;border-radius:50%;
  border:3px solid rgba(255,255,255,0.15);
  border-top-color:#fff;
  animation:tut-spin 0.8s linear infinite;
}
.tut-spinner-logo { animation:tut-pulse 1.6s ease-in-out infinite; }
`;

const STEPS = [
  {
    title: 'Welcome to GridMiner',
    desc: 'Watch how you can start earning step by step through our advanced platform.',
    src: '/videos/step-1.mp4',
  },
  {
    title: 'What is Cloud Mining?',
    desc: 'Understand how the system works and how you earn daily rewards from the cloud.',
    src: '/videos/step-2.mp4',
  },
  {
    title: 'Create Your Account',
    desc: 'Sign up with your email address to get started and access daily mining rewards.',
    src: '/videos/step-3.mp4',
  },
  {
    title: 'Bind Your Wallet',
    desc: 'Connect your TRC20 USDT wallet address so that mining rewards can be paid out directly.',
    src: '/videos/step-4.mp4',
  },
  {
    title: 'Start Mining Daily',
    desc: 'Tap the MINE button every 24 hours to collect your daily reward and grow your earnings.',
    src: '/videos/step-5.mp4',
  },
  {
    title: 'Upgrade Your Tier',
    desc: 'Upgrade to higher tiers to earn dramatically more per day — up to $500/day and beyond.',
    src: '/videos/step-6.mp4',
  },
  {
    title: 'Withdraw Earnings',
    desc: 'Once you reach the withdrawal threshold, request a payout directly to your TRC20 wallet.',
    src: '/videos/step-7.mp4',
  },
];

export default function Tutorials() {
  const navigate = useNavigate();
  const [current, setCurrent] = useState(0);
  const [headerVisible, setHeaderVisible] = useState(true);
  const [bottomVisible, setBottomVisible] = useState(true);
  // Track loading state per video — all start as loading
  const [loading, setLoading] = useState(() => STEPS.map(() => true));
  const videoRefs = useRef([]);
  const trackRef = useRef(null);
  const containerRef = useRef(null);

  const markLoaded = useCallback((i) => {
    setLoading(prev => { const n = [...prev]; n[i] = false; return n; });
  }, []);

  // Touch/drag state
  const dragRef = useRef({ startY: 0, isDragging: false, startedAt: 0 });
  const hideTimerRef = useRef(null);

  const goToStep = useCallback((index) => {
    if (index < 0 || index >= STEPS.length) return;
    setCurrent(index);
  }, []);

  // Sync video playback when current changes
  useEffect(() => {
    videoRefs.current.forEach((vid, i) => {
      if (!vid) return;
      if (i === current) {
        vid.currentTime = 0;
        vid.play().catch(() => {});
      } else {
        vid.pause();
        vid.currentTime = 0;
      }
    });
    // Slide the track
    if (trackRef.current) {
      trackRef.current.style.transform = `translateY(${-current * 100}dvh)`;
    }
  }, [current]);

  // Auto-hide UI after 3s of no interaction
  const resetHideTimer = useCallback(() => {
    setHeaderVisible(true);
    setBottomVisible(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      setHeaderVisible(false);
      setBottomVisible(false);
    }, 3000);
  }, []);

  useEffect(() => {
    resetHideTimer();
    return () => { if (hideTimerRef.current) clearTimeout(hideTimerRef.current); };
  }, [current, resetHideTimer]);

  // Touch handlers for swipe navigation
  const onTouchStart = (e) => {
    dragRef.current = { startY: e.touches[0].clientY, isDragging: true, startedAt: Date.now() };
    resetHideTimer();
  };
  const onTouchEnd = (e) => {
    if (!dragRef.current.isDragging) return;
    const dy = dragRef.current.startY - e.changedTouches[0].clientY;
    const dt = Date.now() - dragRef.current.startedAt;
    dragRef.current.isDragging = false;
    if (Math.abs(dy) > 50 || (Math.abs(dy) > 20 && dt < 300)) {
      if (dy > 0) goToStep(current + 1);
      else goToStep(current - 1);
    }
  };

  // Mouse/trackpad drag support
  const onMouseDown = (e) => {
    dragRef.current = { startY: e.clientY, isDragging: true, startedAt: Date.now() };
    resetHideTimer();
  };
  const onMouseUp = (e) => {
    if (!dragRef.current.isDragging) return;
    const dy = dragRef.current.startY - e.clientY;
    dragRef.current.isDragging = false;
    if (Math.abs(dy) > 60) {
      if (dy > 0) goToStep(current + 1);
      else goToStep(current - 1);
    }
  };

  const handleTap = () => resetHideTimer();

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#000',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        fontFamily: 'var(--font-body, system-ui, sans-serif)',
        touchAction: 'none',
        userSelect: 'none',
      }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
      onClick={handleTap}
      ref={containerRef}
    >
      {/* Spinner keyframe styles */}
      <style>{spinnerStyle}</style>

      {/* Header */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          padding: '56px 24px 32px',
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.4) 60%, transparent 100%)',
          transition: 'opacity 0.4s ease, visibility 0.4s ease',
          opacity: headerVisible ? 1 : 0,
          visibility: headerVisible ? 'visible' : 'hidden',
          pointerEvents: headerVisible ? 'auto' : 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button
            onClick={(e) => { e.stopPropagation(); navigate(-1); }}
            style={{
              width: 44, height: 44,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.15)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff',
              cursor: 'pointer',
              transition: 'transform 0.15s ease',
            }}
          >
            <ChevronLeft size={24} />
          </button>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <h2 style={{ color: '#fff', fontWeight: 900, fontSize: 18, margin: 0, letterSpacing: '-0.02em' }}>
              How It Works
            </h2>
          </div>
          <div style={{ width: 44 }} />
        </div>
      </div>

      {/* Video track */}
      <div
        ref={trackRef}
        style={{
          height: '100%',
          width: '100%',
          willChange: 'transform',
          transition: 'transform 0.42s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        }}
      >
        {STEPS.map((step, i) => (
          <div
            key={i}
            style={{
              height: '100dvh',
              width: '100%',
              position: 'relative',
              flexShrink: 0,
            }}
          >
            <video
              ref={(el) => (videoRefs.current[i] = el)}
              src={step.src}
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
              autoPlay={i === 0}
              playsInline
              preload={Math.abs(i - current) <= 1 ? 'auto' : 'metadata'}
              loop
              muted={false}
              onCanPlay={() => markLoaded(i)}
            />
            {/* Loading spinner overlay */}
            {loading[i] && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  zIndex: 80,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 20,
                  background: 'rgba(0,0,0,0.75)',
                  backdropFilter: 'blur(6px)',
                }}
              >
                <div className="tut-spinner-ring" />
                <p
                  className="tut-spinner-logo"
                  style={{
                    color: '#fff',
                    fontSize: 13,
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    margin: 0,
                    textTransform: 'uppercase',
                  }}
                >
                  Loading video…
                </p>
              </div>
            )}
            {/* Dark gradient overlay */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.08) 50%, transparent 100%)',
              }}
            />

            {/* Step counter — always visible */}
            <p
              style={{
                position: 'absolute',
                bottom: 'calc(8rem + 160px)',
                left: '2rem',
                zIndex: 150,
                pointerEvents: 'none',
                color: '#fff',
                fontSize: 10,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                textShadow: '0 1px 6px rgba(0,0,0,0.7)',
                margin: 0,
              }}
            >
              Step {i + 1} of {STEPS.length}
            </p>

            {/* Bottom content */}
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                padding: '32px 32px 40px',
                transition: 'opacity 0.4s ease, visibility 0.4s ease',
                opacity: bottomVisible ? 1 : 0,
                visibility: bottomVisible ? 'visible' : 'hidden',
              }}
            >
              <h3
                style={{
                  color: '#fff',
                  fontSize: 22,
                  fontWeight: 900,
                  lineHeight: 1.25,
                  marginBottom: 8,
                  maxWidth: '65%',
                  textShadow: '0 2px 10px rgba(0,0,0,0.6)',
                }}
              >
                {step.title}
              </h3>
              <p
                style={{
                  color: 'rgba(255,255,255,0.85)',
                  fontSize: 13,
                  lineHeight: 1.6,
                  maxWidth: '60%',
                  textShadow: '0 1px 4px rgba(0,0,0,0.5)',
                  marginBottom: 24,
                }}
              >
                {step.desc}
              </p>

              {/* Dot indicators */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
                {STEPS.map((_, di) => (
                  <button
                    key={di}
                    onClick={(e) => { e.stopPropagation(); goToStep(di); resetHideTimer(); }}
                    style={{
                      width: di === current ? 20 : 6,
                      height: 6,
                      borderRadius: 3,
                      background: di === current ? '#fff' : 'rgba(255,255,255,0.35)',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 0,
                      transition: 'width 0.3s ease, background 0.3s ease',
                    }}
                  />
                ))}
              </div>

              {/* Navigation buttons */}
              <div style={{ display: 'flex', gap: 12 }}>
                {current > 0 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); goToStep(current - 1); resetHideTimer(); }}
                    style={{
                      flex: 1,
                      padding: '14px 0',
                      borderRadius: 100,
                      background: 'rgba(255,255,255,0.15)',
                      backdropFilter: 'blur(12px)',
                      border: '1px solid rgba(255,255,255,0.25)',
                      color: '#fff',
                      fontSize: 14,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    ← Previous
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (current < STEPS.length - 1) { goToStep(current + 1); resetHideTimer(); }
                    else navigate('/dashboard');
                  }}
                  style={{
                    flex: 2,
                    padding: '14px 0',
                    borderRadius: 100,
                    background: 'linear-gradient(135deg, #0ea5e9, #0284c7)',
                    border: 'none',
                    color: '#fff',
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 4px 20px rgba(2,132,199,0.5)',
                  }}
                >
                  {current < STEPS.length - 1 ? 'Next →' : 'Get Started →'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Right side dot progress rail */}
      <div
        style={{
          position: 'absolute',
          right: 16,
          top: '50%',
          transform: 'translateY(-50%)',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          zIndex: 60,
          opacity: headerVisible ? 1 : 0,
          transition: 'opacity 0.4s ease',
        }}
      >
        {STEPS.map((_, i) => (
          <div
            key={i}
            style={{
              width: 3,
              height: i === current ? 20 : 6,
              borderRadius: 4,
              background: i === current ? '#fff' : 'rgba(255,255,255,0.3)',
              transition: 'height 0.3s ease, background 0.3s ease',
            }}
          />
        ))}
      </div>
    </div>
  );
}
