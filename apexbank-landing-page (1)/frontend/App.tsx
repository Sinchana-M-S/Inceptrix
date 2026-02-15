import React, { useState } from "react";
import {
  Shield,
  Lightning,
  PiggyBank,
  CreditCardIcon,
  Headset,
  Globe,
  Lock,
  Eye,
  Badge,
  Contactless,
  EmailIcon,
  PhoneIcon,
  LocationIcon,
} from "./components/Icons";
import {
  customerLogin,
  employeeLogin,
  customerRegister,
  employeeRegister,
  setAuthToken,
  setUserType,
  setUserName,
  getAuthToken,
  getUserType,
  getGoogleAuthUrl,
  resendVerificationEmail,
  verifyEmail,
  emailLogin,
  verifyMagicLink,
  getUserName,
  logout,
} from "./utils/api";
import PolicyGuardianDashboard from "./components/PolicyGuardianDashboard";
import PolicyChangeView from "./components/PolicyChangeView";

// Revenue Leakage (RetainAI) app URL - set VITE_FORECLOSURE_APP_URL in .env or default
const FORECLOSURE_APP_URL =
  (import.meta as unknown as { env?: { VITE_FORECLOSURE_APP_URL?: string } }).env?.VITE_FORECLOSURE_APP_URL ||
  "http://localhost:5000";

// --- Revenue Leakage View (standalone, not inside PolicyGuardian) ---
const RevenueLeakageView = ({
  onBackHome,
  onLogout,
}: {
  onBackHome: () => void;
  onLogout: () => void;
}) => (
  <div className="min-h-screen flex flex-col bg-[#f8fafc]">
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-6 shrink-0">
      <button
        type="button"
        onClick={onBackHome}
        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-sm text-[#0a192f] hover:bg-gray-50 font-medium"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back to ApexBank
      </button>
      <h1 className="text-lg font-semibold text-[#0a192f]">Revenue Leakage Early Warning</h1>
      <button
        type="button"
        onClick={onLogout}
        className="px-3 py-2 rounded-lg border border-gray-200 text-sm text-[#64748b] hover:bg-gray-50 font-medium"
      >
        Logout
      </button>
    </header>
    <div className="flex-1 min-h-0 p-4">
      <div className="rounded-xl border border-gray-200 overflow-hidden bg-white h-full min-h-[calc(100vh-6rem)]">
        <iframe
          title="Revenue Leakage Early Warning System (RetainAI)"
          src={FORECLOSURE_APP_URL}
          className="w-full h-full min-h-[600px] border-0"
          allow="fullscreen"
        />
      </div>
    </div>
  </div>
);

// --- Shared Components ---

const Button = ({
  children,
  variant = "primary",
  className = "",
  onClick,
  icon: Icon,
}: {
  children?: React.ReactNode;
  variant?: "primary" | "outline" | "ghost" | "beige" | "dark-outline";
  className?: string;
  onClick?: () => void;
  icon?: React.FC<{ className?: string }>;
}) => {
  const baseStyles =
    "px-6 py-3 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2";
  const variants = {
    primary: "bg-[#c5a059] hover:bg-[#b38e4a] text-[#0a192f] shadow-lg",
    outline: "border border-[#c5a059]/30 text-white hover:bg-[#c5a059]/10",
    ghost: "text-[#64748b] hover:text-[#c5a059]",
    beige: "bg-[#e3d0ae] hover:bg-[#d4c19d] text-[#786a4e] font-bold",
    "dark-outline": "border border-white/20 text-white hover:bg-white/10",
  };

  return (
    <button
      onClick={onClick}
      className={`${baseStyles} ${variants[variant]} ${className}`}
    >
      {children}
      {Icon && <Icon className="w-4 h-4" />}
    </button>
  );
};

const SectionTitle = ({
  title,
  highlight,
  subtitle,
  align = "center",
  light = false,
}: {
  title: string;
  highlight?: string;
  subtitle?: string;
  align?: "left" | "center";
  light?: boolean;
}) => (
  <div className={`mb-12 ${align === "center" ? "text-center" : "text-left"}`}>
    <h2
      className={`text-3xl md:text-5xl font-bold mb-4 ${
        light ? "text-white" : "text-[#0a192f]"
      }`}
    >
      {title} <span className="text-[#c5a059]">{highlight}</span>
    </h2>
    {subtitle && (
      <p className="text-[#64748b] max-w-2xl mx-auto text-lg leading-relaxed">
        {subtitle}
      </p>
    )}
  </div>
);

// --- Sub-Components ---

const CreditCardGold = () => (
  <div className="relative w-[340px] h-[210px] sm:w-[380px] sm:h-[240px] bg-gradient-to-br from-[#c5a059] via-[#d4af37] to-[#b38e4a] rounded-2xl p-8 card-shadow animate-float z-20 overflow-hidden">
    <div className="absolute inset-0 opacity-10 pointer-events-none">
      <Globe className="w-full h-full scale-150 translate-x-1/4" />
    </div>
    <div className="relative z-10 h-full flex flex-col justify-between">
      <div className="flex justify-between items-start">
        <div className="flex flex-col">
          <Shield className="w-8 h-8 text-[#0a192f]/40 mb-2" />
          <span className="text-[10px] uppercase tracking-widest text-[#0a192f]/60 font-bold">
            Apex Platinum
          </span>
        </div>
        <Contactless className="w-6 h-6 text-[#0a192f]/30" />
      </div>
      <div className="flex items-center gap-4 mb-4">
        <div className="w-12 h-9 card-chip rounded-md border border-black/10 flex items-center justify-center">
          <div className="w-8 h-6 border-x border-y border-black/10"></div>
        </div>
      </div>
      <div className="space-y-1">
        <p className="text-[9px] uppercase text-[#0a192f]/40 font-bold tracking-widest">
          Card Number
        </p>
        <p className="text-xl sm:text-2xl tracking-[0.15em] font-mono text-[#0a192f]">
          •••• •••• •••• 4892
        </p>
      </div>
      <div className="flex justify-between items-end">
        <div className="flex flex-col">
          <p className="text-[8px] uppercase text-[#0a192f]/40 font-bold">
            Card Holder
          </p>
          <p className="text-xs uppercase text-[#0a192f] font-bold">
            Alex Rivera
          </p>
        </div>
        <div className="w-10 h-10 rounded-full bg-[#0a192f]/10 flex items-center justify-center font-bold italic text-[#0a192f]">
          V
        </div>
      </div>
    </div>
  </div>
);

const CreditCardGlass = () => (
  <div className="relative w-[340px] h-[210px] sm:w-[380px] sm:h-[240px] glass rounded-2xl p-8 card-shadow animate-float-delayed z-10 rotate-[-8deg] overflow-hidden">
    <div className="relative z-10 h-full flex flex-col justify-between">
      <div className="flex justify-between items-start">
        <div className="flex flex-col">
          <Shield className="w-8 h-8 text-white/20 mb-2" />
          <span className="text-[10px] uppercase tracking-widest text-white/30 font-bold">
            Virtual Access
          </span>
        </div>
        <Contactless className="w-6 h-6 text-white/20" />
      </div>
      <div className="w-12 h-9 bg-white/10 rounded-md border border-white/5" />
      <div className="space-y-1">
        <p className="text-[9px] uppercase text-white/20 font-bold tracking-widest">
          Digital Only
        </p>
        <p className="text-xl sm:text-2xl tracking-[0.15em] font-mono text-white/60">
          •••• •••• •••• 1024
        </p>
      </div>
      <div className="flex justify-between items-end">
        <p className="text-xs uppercase text-white/40 font-bold">Apex Cloud</p>
        <div className="flex -space-x-3">
          <div className="w-8 h-8 rounded-full bg-red-500/40 backdrop-blur-sm border border-white/10" />
          <div className="w-8 h-8 rounded-full bg-yellow-500/40 backdrop-blur-sm border border-white/10" />
        </div>
      </div>
    </div>
  </div>
);

// --- Page Views ---

const LandingPage = ({
  onSignup,
  onLogin,
  onLogout,
  isLoggedIn,
  displayName,
  onOpenEmployeeDashboard,
  onOpenPolicyChange,
  onOpenRevenueLeakage,
}: {
  onSignup: () => void;
  onLogin: () => void;
  onLogout: () => void;
  isLoggedIn: boolean;
  displayName: string | null;
  onOpenEmployeeDashboard?: () => void;
  onOpenPolicyChange?: () => void;
  onOpenRevenueLeakage?: () => void;
}) => {
  const userType = getUserType();
  const isEmployee = userType === "employee";

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-2 cursor-pointer">
              <div className="bg-[#0a192f] p-1.5 rounded-lg">
                <Shield className="w-6 h-6 text-[#c5a059]" />
              </div>
              <span className="text-2xl font-bold text-[#0a192f]">
                Apex<span className="text-[#c5a059]">Bank</span>
              </span>
            </div>
            <div className="hidden md:flex items-center gap-8 text-[#64748b] font-medium">
              <a href="#" className="hover:text-[#c5a059] transition-colors">
                Home
              </a>
              <a href="#" className="hover:text-[#c5a059] transition-colors">
                Services
              </a>
              {isLoggedIn && isEmployee ? (
                <>
                  <span className="font-medium">Employee Dashboard</span>
                  <button
                    onClick={onOpenEmployeeDashboard}
                    className="px-4 py-2 rounded-lg bg-[#c5a059]/10 text-[#c5a059] hover:bg-[#c5a059]/20 transition-colors font-medium flex items-center gap-2"
                  >
                    <Shield className="w-4 h-4" />
                    PolicyGuardian Suite
                  </button>
                  <button
                    onClick={onOpenPolicyChange}
                    className="px-4 py-2 rounded-lg border border-[#c5a059]/30 text-[#c5a059] hover:bg-[#c5a059]/10 transition-colors font-medium flex items-center gap-2"
                  >
                    Policy Change
                  </button>
                  <button
                    onClick={onOpenRevenueLeakage}
                    className="px-4 py-2 rounded-lg border border-[#c5a059]/30 text-[#c5a059] hover:bg-[#c5a059]/10 transition-colors font-medium flex items-center gap-2"
                  >
                    <Lightning className="w-4 h-4" />
                    Revenue Leakage
                  </button>
                </>
              ) : (
                <span className="font-medium">
                  {isLoggedIn && getUserType() === "customer"
                    ? "Customer Dashboard"
                    : "Dashboard"}
                </span>
              )}
            </div>
            <div className="flex items-center gap-4">
              {!isLoggedIn ? (
                <>
                  <button
                    onClick={onLogin}
                    className="hidden sm:block text-[#64748b] font-medium hover:text-[#0a192f]"
                  >
                    Login
                  </button>
                  <Button
                    onClick={onSignup}
                    variant="primary"
                    className="!px-5 !py-2.5"
                  >
                    Open Account
                  </Button>
                </>
              ) : (
                <>
                  <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-full bg-white/80 border border-gray-200">
                    <div className="w-8 h-8 rounded-full bg-[#0a192f] flex items-center justify-center text-sm font-semibold text-[#c5a059]">
                      {(displayName || "U").charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium text-[#0a192f]">
                      {displayName || "Logged in"}
                    </span>
                  </div>
                  <Button
                    onClick={onLogout}
                    variant="outline"
                    className="!px-5 !py-2.5"
                  >
                    Logout
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="relative min-h-screen pt-32 pb-20 flex items-center overflow-hidden bg-[#0a192f] text-white">
        <div className="absolute inset-0 grid-pattern opacity-20 pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 text-sm mb-8 text-[#c5a059] mx-auto lg:mx-0">
                <Shield className="w-4 h-4" />
                <span>Trusted by over 2.4M members</span>
              </div>
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.1] mb-6 tracking-tight">
                Secure. Simple. <br />
                <span className="text-[#c5a059]">Smarter Banking.</span>
              </h1>
              <p className="text-gray-400 text-lg md:text-xl mb-10 max-w-lg leading-relaxed mx-auto lg:mx-0">
                Experience banking reimagined. Instant transfers, intelligent
                savings, and complete control over your finances.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Button
                  onClick={onSignup}
                  variant="primary"
                  className="!px-8 !py-4 text-lg"
                >
                  Open an Account
                </Button>
                <Button
                  onClick={onLogin}
                  variant="outline"
                  className="!px-8 !py-4 text-lg"
                >
                  Login to Portal
                </Button>
              </div>
            </div>
            <div className="relative flex items-center justify-center h-[400px] sm:h-[500px] lg:h-[600px] scale-75 sm:scale-90 lg:scale-100">
              <div className="absolute w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[120px] -z-10" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                <CreditCardGold />
              </div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/4 -translate-y-1/3">
                <CreditCardGlass />
              </div>
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#f8fafc] to-transparent" />
      </header>

      {/* Services Section (Matching Screenshot 1) */}
      <section className="py-32 bg-[#f8fafc]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionTitle
            title="Everything You Need,"
            highlight="Nothing You Don't"
            subtitle="Modern banking tools designed for the way you actually live and work. Simple, powerful, and always secure."
          />
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: <Shield className="w-6 h-6 text-[#c5a059]" />,
                title: "Secure Online Banking",
                desc: "Military-grade encryption protects every transaction. Your data stays private and secure, always.",
              },
              {
                icon: <Lightning className="w-6 h-6 text-[#c5a059]" />,
                title: "Instant Transfers",
                desc: "Send money anywhere in seconds. Real-time payments to friends, family, or businesses worldwide.",
              },
              {
                icon: <PiggyBank className="w-6 h-6 text-[#c5a059]" />,
                title: "Smart Savings",
                desc: "Automated savings tools and high-yield accounts help your money grow faster.",
              },
              {
                icon: <CreditCardIcon className="w-6 h-6 text-[#c5a059]" />,
                title: "Premium Cards",
                desc: "Exclusive credit and debit cards with premium rewards, no foreign fees, and luxury perks.",
              },
              {
                icon: <Headset className="w-6 h-6 text-[#c5a059]" />,
                title: "24/7 Support",
                desc: "Expert help whenever you need it. Real humans available around the clock.",
              },
              {
                icon: <Globe className="w-6 h-6 text-[#c5a059]" />,
                title: "Global Access",
                desc: "Bank from anywhere in the world. Multi-currency accounts and competitive exchange rates.",
              },
            ].map((s, idx) => (
              <div
                key={idx}
                className="bg-white p-12 rounded-[2rem] shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 group"
              >
                <div className="bg-gray-50 w-16 h-16 rounded-2xl flex items-center justify-center mb-8 group-hover:bg-[#c5a059]/10 transition-colors">
                  {s.icon}
                </div>
                <h3 className="text-2xl font-bold text-[#0a192f] mb-4 tracking-tight">
                  {s.title}
                </h3>
                <p className="text-[#64748b] leading-relaxed text-lg">
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security & Stats Section (Matching Screenshot 2) */}
      <section className="py-32 bg-[#f8fafc]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center mb-8">
            <div className="bg-white border border-gray-200 px-6 py-2 rounded-full flex items-center gap-2 text-sm font-semibold text-[#0a192f]">
              <Shield className="w-4 h-4 text-[#c5a059]" />
              Your Security is Our Priority
            </div>
          </div>
          <SectionTitle
            title="Built on Trust,"
            highlight="Backed by Technology"
            subtitle="We employ the most advanced security measures in the industry to keep your money and information safe."
          />

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto mb-20">
            {[
              {
                icon: <Lock className="w-6 h-6 text-[#c5a059]" />,
                title: "Bank-Grade Encryption",
                desc: "256-bit AES encryption protects all your data in transit and at rest.",
              },
              {
                icon: <Eye className="w-6 h-6 text-[#c5a059]" />,
                title: "Real-Time Fraud Detection",
                desc: "AI-powered monitoring catches suspicious activity before it becomes a problem.",
              },
              {
                icon: <Shield className="w-6 h-6 text-[#c5a059]" />,
                title: "Privacy First",
                desc: "We never sell your data. Your financial information belongs to you alone.",
              },
              {
                icon: <Badge className="w-6 h-6 text-[#c5a059]" />,
                title: "Regulatory Compliant",
                desc: "Fully licensed and regulated by leading financial authorities worldwide.",
              },
            ].map((f, i) => (
              <div
                key={i}
                className="bg-white p-8 rounded-3xl border border-gray-100 flex items-center gap-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="bg-gray-50 w-16 h-16 rounded-2xl shrink-0 flex items-center justify-center">
                  {f.icon}
                </div>
                <div>
                  <h4 className="font-bold text-xl text-[#0a192f] mb-1">
                    {f.title}
                  </h4>
                  <p className="text-[#64748b] leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Stats Bar */}
          <div className="bg-[#0a192f] rounded-[3rem] p-16 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-[100px] -mr-48 -mt-48" />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-12 relative z-10 text-center">
              <div>
                <p className="text-5xl font-bold text-[#c5a059] mb-3">2M+</p>
                <p className="text-gray-400 font-medium">Active Customers</p>
              </div>
              <div>
                <p className="text-5xl font-bold text-[#c5a059] mb-3">$50B+</p>
                <p className="text-gray-400 font-medium">Assets Protected</p>
              </div>
              <div>
                <p className="text-5xl font-bold text-[#c5a059] mb-3">99.99%</p>
                <p className="text-gray-400 font-medium">Uptime</p>
              </div>
              <div>
                <p className="text-5xl font-bold text-[#c5a059] mb-3">4.9★</p>
                <p className="text-gray-400 font-medium">App Store Rating</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section (Matching Screenshot 3) */}
      <section className="py-32 bg-[#f8fafc]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-[#0a192f] rounded-[4rem] p-16 md:p-32 text-center relative overflow-hidden shadow-2xl">
            <div className="absolute inset-0 grid-pattern opacity-10" />
            <div className="relative z-10 max-w-4xl mx-auto">
              <h2 className="text-4xl md:text-7xl font-bold text-white mb-8 leading-tight">
                Ready to Experience{" "}
                <span className="text-[#c5a059]">Better Banking?</span>
              </h2>
              <p className="text-gray-400 text-xl md:text-2xl mb-16 max-w-3xl mx-auto leading-relaxed">
                Join millions who've already made the switch to smarter, more
                secure banking. Open your account in minutes.
              </p>
              <div className="flex flex-col sm:flex-row gap-6 justify-center">
                <Button
                  onClick={onSignup}
                  variant="primary"
                  className="!px-12 !py-6 !text-xl !rounded-[1.5rem]"
                  icon={() => (
                    <svg
                      className="w-6 h-6 ml-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M14 5l7 7m0 0l-7 7m7-7H3"
                      />
                    </svg>
                  )}
                >
                  Get Started Free
                </Button>
                <Button
                  variant="dark-outline"
                  className="!px-12 !py-6 !text-xl !rounded-[1.5rem]"
                >
                  Explore Services
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer Section (Matching Screenshot 4) */}
      <footer className="bg-[#0a192f] pt-32 pb-16 text-white border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-12 gap-16 mb-24">
            <div className="lg:col-span-5">
              <div className="flex items-center gap-3 mb-10">
                <div className="bg-white/5 p-2 rounded-xl border border-white/10">
                  <Shield className="w-8 h-8 text-[#c5a059]" />
                </div>
                <span className="text-3xl font-bold">
                  Apex<span className="text-[#c5a059]">Bank</span>
                </span>
              </div>
              <p className="text-gray-400 text-lg leading-relaxed mb-12 max-w-md">
                Secure, simple, and smarter banking for everyone. Trusted by
                millions worldwide for personal and business financial needs.
              </p>
              <div className="space-y-6">
                <div className="flex items-center gap-4 text-gray-400 hover:text-white transition-colors cursor-pointer group">
                  <EmailIcon className="w-6 h-6 text-[#c5a059]" />
                  <span className="text-lg">support@apexbank.com</span>
                </div>
                <div className="flex items-center gap-4 text-gray-400 hover:text-white transition-colors cursor-pointer group">
                  <PhoneIcon className="w-6 h-6 text-[#c5a059]" />
                  <span className="text-lg">1-800-APEX-BANK</span>
                </div>
                <div className="flex items-center gap-4 text-gray-400 hover:text-white transition-colors cursor-pointer group">
                  <LocationIcon className="w-6 h-6 text-[#c5a059]" />
                  <span className="text-lg">New York, NY 10001</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-12">
              <div>
                <h5 className="text-[#c5a059] font-bold text-xl mb-8">
                  Company
                </h5>
                <ul className="space-y-5 text-gray-400 text-lg">
                  {["About Us", "Careers", "Press", "Contact"].map((link) => (
                    <li key={link}>
                      <a
                        href="#"
                        className="hover:text-white transition-colors"
                      >
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h5 className="text-[#c5a059] font-bold text-xl mb-8">
                  Services
                </h5>
                <ul className="space-y-5 text-gray-400 text-lg">
                  {[
                    "Personal Banking",
                    "Business Banking",
                    "Loans & Credit",
                    "Investments",
                  ].map((link) => (
                    <li key={link}>
                      <a
                        href="#"
                        className="hover:text-white transition-colors"
                      >
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h5 className="text-[#c5a059] font-bold text-xl mb-8">Legal</h5>
                <ul className="space-y-5 text-gray-400 text-lg">
                  {[
                    "Privacy Policy",
                    "Terms of Service",
                    "Security",
                    "Cookie Policy",
                  ].map((link) => (
                    <li key={link}>
                      <a
                        href="#"
                        className="hover:text-white transition-colors"
                      >
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="pt-12 border-t border-white/5 flex flex-col md:row justify-between items-center gap-8 text-gray-500">
            <div className="text-lg">© 2026 ApexBank. All rights reserved.</div>
            <div className="flex items-center gap-12 text-lg">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Bank-grade encryption
              </div>
              <div className="font-bold">FDIC Insured</div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

const SignUpPage = ({
  onBack,
  onLogin,
  onAuthChange,
}: {
  onBack: () => void;
  onLogin: () => void;
  onAuthChange?: (fullName?: string | null) => void;
}) => {
  const [userType, setUserType] = useState<"customer" | "employee">("customer");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [role, setRole] = useState<"employee" | "manager">("employee");
  const [department, setDepartment] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (userType === "customer") {
      if (!firstName || !lastName || !email || !password) {
        setError("All fields are required");
        return;
      }
      if (!agreedToTerms) {
        setError("Please agree to the Terms of Service and Privacy Policy");
        return;
      }
    } else {
      if (!firstName || !lastName || !email || !password || !employeeId) {
        setError("All required fields must be filled");
        return;
      }
    }

    setLoading(true);

    try {
      const response =
        userType === "customer"
          ? await customerRegister({ firstName, lastName, email, password })
          : await employeeRegister({
              firstName,
              lastName,
              email,
              password,
              employeeId,
              role,
              department,
            });

      if (response.success && response.token) {
        setAuthToken(response.token);
        if (response.user?.firstName && response.user?.lastName) {
          setUserName(response.user.firstName, response.user.lastName);
          onAuthChange?.(
            `${response.user.firstName} ${response.user.lastName}`
          );
        } else {
          onAuthChange?.();
        }
        if (userType === "customer" && !response.user?.emailVerified) {
          alert(
            `Registration successful! Please check your email to verify your account.`
          );
        } else {
          alert(
            `Registration successful! Welcome ${response.user?.firstName} ${response.user?.lastName}`
          );
        }
        // After registration, go back home
        onBack();
      } else {
        setError(response.message || "Registration failed");
      }
    } catch (err) {
      setError("Network error. Please check if the server is running.");
      console.error("Registration error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#f8fafc]">
      <div className="hidden lg:flex w-2/5 bg-[#0a192f] flex-col justify-center p-20 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-[120px] -mr-48 -mt-48" />
        <div className="relative z-10">
          <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center mb-10 shadow-xl">
            <Shield className="w-8 h-8 text-[#c5a059]" />
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
            {userType === "customer" ? "Start Banking" : "Join Our Team"} <br />
            in Minutes
          </h2>
          <p className="text-gray-400 text-lg mb-12 max-w-sm">
            {userType === "customer"
              ? "Open your account today and experience the future of banking. No hidden fees, no hassle."
              : "Join ApexBank and help us deliver exceptional banking services to millions of customers worldwide."}
          </p>
          <ul className="space-y-6">
            {(userType === "customer"
              ? [
                  "No monthly fees",
                  "Instant account setup",
                  "FDIC insured deposits",
                  "24/7 customer support",
                ]
              : [
                  "Competitive benefits",
                  "Career growth opportunities",
                  "Modern technology",
                  "Work-life balance",
                ]
            ).map((item, i) => (
              <li key={i} className="flex items-center gap-4 group">
                <div className="w-6 h-6 rounded-full border border-[#c5a059]/30 flex items-center justify-center text-[#c5a059] group-hover:bg-[#c5a059] group-hover:text-[#0a192f] transition-all">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <span className="text-gray-300 font-medium">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="w-full lg:w-3/5 flex flex-col items-center justify-center p-6 md:p-16">
        <div className="w-full max-w-[540px]">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-[#64748b] hover:text-[#0a192f] font-medium mb-12 transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Back to home
          </button>
          <div className="flex items-center gap-2 mb-8">
            <div className="bg-[#0a192f] p-1.5 rounded-lg shadow-lg">
              <Shield className="w-6 h-6 text-[#c5a059]" />
            </div>
            <span className="text-2xl font-bold text-[#0a192f]">
              Apex<span className="text-[#c5a059]">Bank</span>
            </span>
          </div>

          {/* User Type Toggle */}
          <div className="mb-6">
            <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
              <button
                type="button"
                onClick={() => setUserType("customer")}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
                  userType === "customer"
                    ? "bg-[#c5a059] text-white shadow-md"
                    : "text-[#64748b] hover:text-[#0a192f]"
                }`}
              >
                Customer
              </button>
              <button
                type="button"
                onClick={() => setUserType("employee")}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
                  userType === "employee"
                    ? "bg-[#c5a059] text-white shadow-md"
                    : "text-[#64748b] hover:text-[#0a192f]"
                }`}
              >
                Employee/Manager
              </button>
            </div>
          </div>

          <h1 className="text-4xl font-bold text-[#0a192f] mb-2 tracking-tight">
            {userType === "customer"
              ? "Open your account"
              : "Employee Registration"}
          </h1>
          <p className="text-[#64748b] text-lg mb-10">
            {userType === "customer"
              ? "Join millions who trust ApexBank for their financial needs."
              : "Register as a bank employee or manager to access the internal portal."}
          </p>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              {error}
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-[#0a192f] uppercase tracking-wider">
                  First name
                </label>
                <input
                  type="text"
                  placeholder="John"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  className="w-full px-5 py-4 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#c5a059]/20 focus:border-[#c5a059] outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-[#0a192f] uppercase tracking-wider">
                  Last name
                </label>
                <input
                  type="text"
                  placeholder="Doe"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  className="w-full px-5 py-4 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#c5a059]/20 focus:border-[#c5a059] outline-none transition-all"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-[#0a192f] uppercase tracking-wider">
                Email address
              </label>
              <input
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-5 py-4 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#c5a059]/20 focus:border-[#c5a059] outline-none transition-all"
              />
            </div>
            {userType === "employee" && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-[#0a192f] uppercase tracking-wider">
                    Employee ID
                  </label>
                  <input
                    type="text"
                    placeholder="EMP001"
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    required
                    className="w-full px-5 py-4 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#c5a059]/20 focus:border-[#c5a059] outline-none transition-all"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-[#0a192f] uppercase tracking-wider">
                      Role
                    </label>
                    <select
                      value={role}
                      onChange={(e) =>
                        setRole(e.target.value as "employee" | "manager")
                      }
                      className="w-full px-5 py-4 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#c5a059]/20 focus:border-[#c5a059] outline-none transition-all"
                    >
                      <option value="employee">Employee</option>
                      <option value="manager">Manager</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-[#0a192f] uppercase tracking-wider">
                      Department (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="Operations"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full px-5 py-4 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#c5a059]/20 focus:border-[#c5a059] outline-none transition-all"
                    />
                  </div>
                </div>
              </>
            )}
            <div className="space-y-2 relative">
              <label className="text-sm font-bold text-[#0a192f] uppercase tracking-wider">
                Create password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Min. 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full px-5 py-4 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#c5a059]/20 focus:border-[#c5a059] outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#0a192f]"
                >
                  <Eye className="w-5 h-5" />
                </button>
              </div>
            </div>
            {userType === "customer" && (
              <div className="flex items-center gap-3 py-2">
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="w-5 h-5 rounded border-gray-300 text-[#c5a059] focus:ring-[#c5a059]"
                />
                <span className="text-sm text-gray-600">
                  I agree to the{" "}
                  <a
                    href="#"
                    className="text-[#c5a059] font-semibold hover:underline"
                  >
                    Terms of Service
                  </a>{" "}
                  and{" "}
                  <a
                    href="#"
                    className="text-[#c5a059] font-semibold hover:underline"
                  >
                    Privacy Policy
                  </a>
                </span>
              </div>
            )}
            <Button
              variant="beige"
              className="w-full !py-5 !text-lg !rounded-xl !tracking-tight"
              onClick={handleSubmit}
            >
              {loading ? "Creating Account..." : "Create Account"}
            </Button>
            <div className="bg-[#f1f5f9]/50 p-6 rounded-2xl border border-gray-100 flex items-start gap-4">
              <div className="p-1.5 rounded-lg text-[#c5a059]">
                <Shield className="w-5 h-5" />
              </div>
              <p className="text-sm text-[#64748b] leading-relaxed">
                Your personal information is encrypted and secure. We never
                share your data with third parties.
              </p>
            </div>
            <p className="text-center text-[#64748b] font-medium pt-4">
              Already have an account?{" "}
              <button
                onClick={onLogin}
                className="text-[#c5a059] font-bold hover:underline"
              >
                Sign in
              </button>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

const LoginPage = ({
  onBack,
  onSignup,
  onEmployeeDashboard,
  onAuthChange,
}: {
  onBack: () => void;
  onSignup: () => void;
  onEmployeeDashboard: () => void;
  onAuthChange?: (fullName?: string | null) => void;
}) => {
  // Local login toggle: 'customer' vs 'employee'
  const [userTypeState, setUserTypeState] = useState<"customer" | "employee">(
    "customer"
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginMethod, setLoginMethod] = useState<"password" | "email">(
    "password"
  );
  const [emailSent, setEmailSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response =
        userTypeState === "customer"
          ? await customerLogin({ email, password })
          : await employeeLogin({ email, password });

      if (response.success && response.token) {
        setAuthToken(response.token);
        if (response.user?.type) {
          setUserType(response.user.type);
        }
        if (
          response.user?.firstName != null &&
          response.user?.lastName != null
        ) {
          setUserName(response.user.firstName, response.user.lastName);
          onAuthChange?.(
            `${response.user.firstName} ${response.user.lastName}`
          );
        } else {
          onAuthChange?.();
        }
        alert(
          `Login successful! Welcome ${response.user?.firstName} ${response.user?.lastName}`
        );
        // After login (customer or employee), go back to home
        onBack();
      } else {
        // Check if email verification is required
        if (response.emailVerified === false) {
          setError(
            "Please verify your email first. Check your inbox for the verification link."
          );
        } else {
          setError(response.message || "Login failed");
        }
      }
    } catch (err) {
      setError("Network error. Please check if the server is running.");
      console.error("Login error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#f8fafc]">
      <div className="w-full lg:w-3/5 flex flex-col items-center justify-center p-6 md:p-16 bg-white">
        <div className="w-full max-w-[540px]">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-[#64748b] hover:text-[#0a192f] font-medium mb-12 transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Back to home
          </button>
          <div className="flex items-center gap-2 mb-8">
            <div className="bg-[#0a192f] p-1.5 rounded-lg shadow-lg">
              <Shield className="w-6 h-6 text-[#c5a059]" />
            </div>
            <span className="text-2xl font-bold text-[#0a192f]">
              Apex<span className="text-[#c5a059]">Bank</span>
            </span>
          </div>

          {/* User Type Toggle */}
          <div className="mb-6">
            <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
              <button
                type="button"
                onClick={() => setUserTypeState("customer")}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
                  userTypeState === "customer"
                    ? "bg-[#c5a059] text-white shadow-md"
                    : "text-[#64748b] hover:text-[#0a192f]"
                }`}
              >
                Customer
              </button>
              <button
                type="button"
                onClick={() => setUserTypeState("employee")}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
                  userTypeState === "employee"
                    ? "bg-[#c5a059] text-white shadow-md"
                    : "text-[#64748b] hover:text-[#0a192f]"
                }`}
              >
                Employee/Manager
              </button>
            </div>
          </div>

          <h1 className="text-4xl font-bold text-[#0a192f] mb-2 tracking-tight">
            Welcome back
          </h1>
          <p className="text-[#64748b] text-lg mb-10">
            {userTypeState === "customer"
              ? "Sign in to access your account and manage your finances."
              : "Sign in to access the employee portal and manage bank operations."}
          </p>

          {/* Login Method Toggle - Only for customers */}
          {userTypeState === "customer" && (
            <div className="mb-6">
              <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setLoginMethod("password")}
                  className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
                    loginMethod === "password"
                      ? "bg-[#c5a059] text-white shadow-md"
                      : "text-[#64748b] hover:text-[#0a192f]"
                  }`}
                >
                  Password
                </button>
                <button
                  type="button"
                  onClick={() => setLoginMethod("email")}
                  className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
                    loginMethod === "email"
                      ? "bg-[#c5a059] text-white shadow-md"
                      : "text-[#64748b] hover:text-[#0a192f]"
                  }`}
                >
                  Email Link
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              {error}
            </div>
          )}

          {emailSent && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">
              Login link sent! Check your email and click the link to login.
            </div>
          )}

          {/* OAuth Section - Only for customers */}
          {userTypeState === "customer" && (
            <div className="mb-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">
                    Or continue with
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => (window.location.href = getGoogleAuthUrl())}
                className="w-full mt-4 flex items-center justify-center gap-3 px-5 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                <span className="font-medium text-gray-700">
                  Continue with Google
                </span>
              </button>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-sm font-bold text-[#0a192f] uppercase tracking-wider">
                Email address
              </label>
              <input
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-5 py-4 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#c5a059]/20 focus:border-[#c5a059] outline-none transition-all placeholder:text-gray-300"
              />
            </div>

            {loginMethod === "password" && userTypeState === "customer" ? (
              <>
                <div className="space-y-2 relative">
                  <div className="flex justify-between">
                    <label className="text-sm font-bold text-[#0a192f] uppercase tracking-wider">
                      Password
                    </label>
                    <a
                      href="#"
                      className="text-sm text-[#c5a059] font-semibold hover:underline"
                    >
                      Forgot password?
                    </a>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full px-5 py-4 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#c5a059]/20 focus:border-[#c5a059] outline-none transition-all placeholder:text-gray-300"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#0a192f]"
                    >
                      <Eye className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                <Button
                  variant="beige"
                  className="w-full !py-5 !text-lg !rounded-xl !tracking-tight"
                  onClick={handleSubmit}
                >
                  {loading ? "Signing in..." : "Sign In"}
                </Button>
              </>
            ) : loginMethod === "email" && userTypeState === "customer" ? (
              <Button
                variant="beige"
                className="w-full !py-5 !text-lg !rounded-xl !tracking-tight"
                onClick={async (e) => {
                  e.preventDefault();
                  if (!email) {
                    setError("Please enter your email address");
                    return;
                  }
                  setLoading(true);
                  setError("");
                  try {
                    const response = await emailLogin(email);
                    if (response.success) {
                      setEmailSent(true);
                    } else {
                      setError(response.message || "Failed to send login link");
                    }
                  } catch (err) {
                    setError("Network error. Please try again.");
                  } finally {
                    setLoading(false);
                  }
                }}
              >
                {loading ? "Sending..." : "Send Login Link"}
              </Button>
            ) : (
              <>
                <div className="space-y-2 relative">
                  <div className="flex justify-between">
                    <label className="text-sm font-bold text-[#0a192f] uppercase tracking-wider">
                      Password
                    </label>
                    <a
                      href="#"
                      className="text-sm text-[#c5a059] font-semibold hover:underline"
                    >
                      Forgot password?
                    </a>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full px-5 py-4 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#c5a059]/20 focus:border-[#c5a059] outline-none transition-all placeholder:text-gray-300"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#0a192f]"
                    >
                      <Eye className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                <Button
                  variant="beige"
                  className="w-full !py-5 !text-lg !rounded-xl !tracking-tight"
                  onClick={handleSubmit}
                >
                  {loading ? "Signing in..." : "Sign In"}
                </Button>
              </>
            )}
            <div className="bg-[#f1f5f9]/50 p-6 rounded-2xl border border-gray-100 flex items-start gap-4">
              <div className="p-1.5 rounded-lg text-[#c5a059]">
                <Shield className="w-5 h-5" />
              </div>
              <p className="text-sm text-[#64748b] leading-relaxed">
                Your information is protected with bank-level security. We use
                256-bit encryption to keep your data safe.
              </p>
            </div>
            <p className="text-center text-[#64748b] font-medium pt-4">
              Don't have an account?{" "}
              <button
                onClick={onSignup}
                className="text-[#c5a059] font-bold hover:underline"
              >
                Open an account
              </button>
            </p>
          </form>
        </div>
      </div>
      <div className="hidden lg:flex w-2/5 bg-[#0a192f] flex-col justify-center items-center p-20 text-white text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500/5 rounded-full blur-[120px] -ml-48 -mt-48" />
        <div className="relative z-10 flex flex-col items-center">
          <div className="w-24 h-24 bg-white/5 border border-white/10 rounded-[2rem] flex items-center justify-center mb-12 shadow-2xl">
            <Shield className="w-12 h-12 text-[#c5a059]" />
          </div>
          <h2 className="text-4xl font-bold mb-6 leading-tight">
            Secure Banking at Your Fingertips
          </h2>
          <p className="text-gray-400 text-lg max-w-sm leading-relaxed">
            Access your accounts, make transfers, and manage your finances from
            anywhere, anytime. Your security is our top priority.
          </p>
        </div>
      </div>
    </div>
  );
};

// Email Verification Page
const VerifyEmailPage = ({ onBack }: { onBack: () => void }) => {
  const [token, setToken] = useState("");
  const [status, setStatus] = useState<
    "idle" | "verifying" | "success" | "error"
  >("idle");
  const [message, setMessage] = useState("");

  React.useEffect(() => {
    // Get token from URL
    const urlParams = new URLSearchParams(window.location.search);
    const tokenParam = urlParams.get("token");
    if (tokenParam) {
      setToken(tokenParam);
      handleVerify(tokenParam);
    }
  }, []);

  const handleVerify = async (verifyToken: string) => {
    setStatus("verifying");
    try {
      const response = await verifyEmail(verifyToken);
      if (response.success) {
        setStatus("success");
        setMessage("Email verified successfully! You can now login.");
      } else {
        setStatus("error");
        setMessage(response.message || "Verification failed");
      }
    } catch (err) {
      setStatus("error");
      setMessage("Network error. Please try again.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] p-6">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center">
          <Shield className="w-16 h-16 text-[#c5a059] mx-auto mb-6" />
          {status === "verifying" && (
            <>
              <h1 className="text-2xl font-bold text-[#0a192f] mb-4">
                Verifying Email...
              </h1>
              <p className="text-[#64748b]">
                Please wait while we verify your email address.
              </p>
            </>
          )}
          {status === "success" && (
            <>
              <h1 className="text-2xl font-bold text-[#0a192f] mb-4">
                Email Verified!
              </h1>
              <p className="text-[#64748b] mb-6">{message}</p>
              <Button onClick={onBack} variant="primary">
                Go to Login
              </Button>
            </>
          )}
          {status === "error" && (
            <>
              <h1 className="text-2xl font-bold text-[#0a192f] mb-4">
                Verification Failed
              </h1>
              <p className="text-[#64748b] mb-6">{message}</p>
              <Button onClick={onBack} variant="primary">
                Go to Login
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [view, setView] = useState<
    "home" | "signup" | "login" | "verify-email" | "employee-dashboard" | "policy-change" | "foreclosure"
  >("home");
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(!!getAuthToken());
  const [displayName, setDisplayName] = useState<string | null>(null);

  // On load: if already logged in as employee, show PolicyGuardian dashboard
  React.useEffect(() => {
    const token = getAuthToken();
    const userType = getUserType();
    const storedName = window.localStorage.getItem("userName");
    if (token) {
      setIsLoggedIn(true);
      if (storedName) setDisplayName(storedName);
    }
    if (token && userType === "employee") {
      setView("employee-dashboard");
    }
  }, []);

  // Check for OAuth callback, email verification, or magic link
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get("token");
    const type = urlParams.get("type");

    // Check if it's an OAuth callback
    if (token && type) {
      setAuthToken(token);
      window.history.replaceState({}, document.title, window.location.pathname);
      setView("home");
      alert("Login successful!");
      return;
    }

    // Check if it's a magic link
    if (window.location.pathname.includes("magic-link") && token) {
      handleMagicLinkLogin(token);
      return;
    }

    // Check if it's an email verification
    if (window.location.pathname.includes("verify-email") && token) {
      setView("verify-email");
    }
  }, []);

  const handleMagicLinkLogin = async (token: string) => {
    try {
      const response = await verifyMagicLink(token);
      if (response.success && response.token) {
        setAuthToken(response.token);
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname
        );
        setView("home");
        if (response.user?.firstName && response.user?.lastName) {
          const name = `${response.user.firstName} ${response.user.lastName}`;
          setDisplayName(name);
          setIsLoggedIn(true);
        }
        alert(
          `Login successful! Welcome ${response.user?.firstName} ${response.user?.lastName}`
        );
      } else {
        alert(response.message || "Invalid or expired login link");
        setView("login");
      }
    } catch (err) {
      alert("Network error. Please try again.");
      setView("login");
    }
  };

  const handleAuthChange = (fullName?: string | null) => {
    setIsLoggedIn(!!getAuthToken());
    if (fullName) {
      setDisplayName(fullName);
    } else {
      const storedName = window.localStorage.getItem("userName");
      if (storedName) setDisplayName(storedName);
    }
  };

  const handleLogout = () => {
    window.localStorage.removeItem("authToken");
    window.localStorage.removeItem("userType");
    window.localStorage.removeItem("userName");
    setIsLoggedIn(false);
    setDisplayName(null);
    setView("home");
  };

  return (
    <div className="min-h-screen bg-white">
      {view === "home" && (
        <LandingPage
          isLoggedIn={isLoggedIn}
          displayName={displayName}
          onSignup={() => setView("signup")}
          onLogin={() => setView("login")}
          onLogout={handleLogout}
          onOpenEmployeeDashboard={() => setView("employee-dashboard")}
          onOpenPolicyChange={() => setView("policy-change")}
          onOpenRevenueLeakage={() => setView("foreclosure")}
        />
      )}
      {view === "signup" && (
        <SignUpPage
          onBack={() => setView("home")}
          onLogin={() => setView("login")}
          onAuthChange={handleAuthChange}
        />
      )}
      {view === "login" && (
        <LoginPage
          onBack={() => setView("home")}
          onSignup={() => setView("signup")}
          onEmployeeDashboard={() => setView("employee-dashboard")}
          onAuthChange={handleAuthChange}
        />
      )}
      {view === "verify-email" && (
        <VerifyEmailPage onBack={() => setView("login")} />
      )}
      {view === "employee-dashboard" && (
        <PolicyGuardianDashboard
          onLogout={() => {
            handleLogout();
          }}
          onBackHome={() => setView("home")}
          onOpenPolicyChange={() => setView("policy-change")}
        />
      )}
      {view === "policy-change" && (
        <PolicyChangeView
          onBackHome={() => setView("home")}
          onBackToDashboard={() => setView("employee-dashboard")}
        />
      )}
      {view === "foreclosure" && (
        <RevenueLeakageView
          onBackHome={() => setView("home")}
          onLogout={handleLogout}
        />
      )}
    </div>
  );
}
