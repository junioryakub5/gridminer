import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Play } from 'lucide-react';

const STEPS = [
  { title: 'Create Your Account', desc: 'Sign up with your email address to get started. Your account gives you access to daily mining rewards starting from Tier 1.' },
  { title: 'Bind Your Wallet', desc: 'Connect your TRC20 USDT wallet address so that mining rewards can be paid out directly to your wallet.' },
  { title: 'Start Mining Daily', desc: 'Tap the MINE button every 24 hours to collect your daily reward. Tier 1 earns $1.00 USDT every day for 100 days.' },
  { title: 'Upgrade Your Tier', desc: 'Upgrade to higher tiers to earn dramatically more per day. Tier 2 earns $50/day, Tier 3 earns $150/day, and beyond!' },
  { title: 'Withdraw Earnings', desc: 'Once you reach the withdrawal threshold, request a payout directly to your TRC20 wallet address within 24 hours.' },
];

export default function Tutorials() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);

  return (
    <div className="page">
      <div className="inner-header">
        <button className="back-btn" onClick={() => navigate(-1)}><ChevronLeft size={20} /></button>
        <h2 className="inner-title">How It Works</h2>
        <div />
      </div>
      <div className="tut-container">
        <div className="tut-video">
          <div className="tut-play-btn"><Play size={22} fill="white" color="white" /></div>
          <div className="tut-video-title">{STEPS[step].title}</div>
        </div>
        <div className="step-counter">Step {step + 1} of {STEPS.length}</div>
        <p className="tut-desc">{STEPS[step].desc}</p>
        <div className="tut-dots">
          {STEPS.map((_, i) => (
            <button key={i} className={`dot ${i === step ? 'dot-active' : ''}`} onClick={() => setStep(i)} />
          ))}
        </div>
        <div className="tut-btns">
          <button className="tut-prev" onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0}>← Previous</button>
          {step < STEPS.length - 1
            ? <button className="tut-next" onClick={() => setStep(s => s + 1)}>Next →</button>
            : <button className="tut-next" onClick={() => navigate('/dashboard')}>Get Started →</button>
          }
        </div>
      </div>
    </div>
  );
}
