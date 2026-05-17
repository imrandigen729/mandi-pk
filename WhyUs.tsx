import React from 'react';
import { ShieldCheck, Users, Eye, Search, TrendingUp, CheckCircle, Heart, Globe, Target } from 'lucide-react';
import { Link } from 'react-router-dom';

export function WhyUs() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16 flex-1 w-full">
      <div className="text-center mb-16">
        <h1 className="text-4xl md:text-5xl font-extrabold text-stone-900 mb-6 tracking-tight">About Us – Mandi.pk</h1>
        <p className="text-lg md:text-xl text-stone-600 max-w-2xl mx-auto leading-relaxed">
          Welcome to the future of marketplaces. A space where you can grow, trade, and connect.
        </p>
      </div>

      <div className="space-y-16">
        
        {/* Our Story */}
        <section className="bg-white p-8 md:p-10 rounded-3xl shadow-sm border border-stone-200">
          <div className="flex items-center gap-4 mb-6">
            <div className="bg-blue-100 p-3 rounded-2xl">
              <Globe className="w-8 h-8 text-blue-600" />
            </div>
            <h2 className="text-3xl font-bold text-stone-900">Our Story</h2>
          </div>
          <p className="text-stone-600 leading-relaxed text-lg mb-4">
            Mandi.pk was created with a simple idea — to bring the traditional marketplace experience into the digital world while making it safer, smarter, and more transparent for everyone.
          </p>
          <p className="text-stone-600 leading-relaxed text-lg">
            In Pakistan, "Mandi" has always been more than just a market. It is a place where people connect, trade, and build trust through everyday buying and selling. We are carrying that same spirit into the digital era.
          </p>
        </section>

        {/* Our Mission */}
        <section className="bg-stone-50 p-8 md:p-10 rounded-3xl border border-stone-200">
          <div className="flex items-center gap-4 mb-6">
            <div className="bg-emerald-100 p-3 rounded-2xl">
              <Target className="w-8 h-8 text-emerald-600" />
            </div>
            <h2 className="text-3xl font-bold text-stone-900">Our Mission</h2>
          </div>
          <p className="text-stone-600 leading-relaxed text-lg mb-6">
            Our mission is to empower individuals and businesses by providing a secure and trusted platform where anyone can buy and sell items with confidence. We aim to remove barriers between buyers and sellers by introducing:
          </p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-stone-800">
            <li className="flex items-center gap-3 bg-white p-4 rounded-xl shadow-sm border border-stone-100">
              <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" /> Verified user accounts
            </li>
            <li className="flex items-center gap-3 bg-white p-4 rounded-xl shadow-sm border border-stone-100">
              <Eye className="w-5 h-5 text-purple-500 shrink-0" /> Transparent listings
            </li>
            <li className="flex items-center gap-3 bg-white p-4 rounded-xl shadow-sm border border-stone-100">
              <ShieldCheck className="w-5 h-5 text-amber-500 shrink-0" /> Secure communication
            </li>
            <li className="flex items-center gap-3 bg-white p-4 rounded-xl shadow-sm border border-stone-100">
              <Search className="w-5 h-5 text-blue-500 shrink-0" /> Easy and accessible tools
            </li>
          </ul>
        </section>

        {/* What We Stand For */}
        <section>
          <h2 className="text-3xl font-bold text-stone-900 mb-8 text-center">What We Stand For</h2>
          <p className="text-center text-stone-600 mb-10 max-w-2xl mx-auto text-lg">
            At Mandi.pk, we believe that trust is the foundation of every transaction. That's why we focus on:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200 text-center">
              <ShieldCheck className="w-10 h-10 text-stone-900 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-stone-900 mb-2">Security</h3>
              <p className="text-stone-600">Safe interactions between users</p>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200 text-center">
              <CheckCircle className="w-10 h-10 text-emerald-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-stone-900 mb-2">Verification</h3>
              <p className="text-stone-600">Building trust through verified profiles</p>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200 text-center">
              <Eye className="w-10 h-10 text-blue-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-stone-900 mb-2">Transparency</h3>
              <p className="text-stone-600">Clear and honest listings</p>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200 text-center">
              <TrendingUp className="w-10 h-10 text-amber-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-stone-900 mb-2">Simplicity</h3>
              <p className="text-stone-600">Easy-to-use platform for everyone</p>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200 text-center lg:col-span-2">
              <Users className="w-10 h-10 text-purple-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-stone-900 mb-2">Community</h3>
              <p className="text-stone-600">A growing digital marketplace for Pakistan</p>
            </div>
          </div>
        </section>

        {/* Why Mandi.pk & Our Vision */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <section className="bg-white p-8 rounded-3xl shadow-sm border border-amber-200 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-amber-500"></div>
            <h2 className="text-2xl font-bold text-stone-900 mb-4">Why Mandi.pk?</h2>
            <p className="text-stone-600 mb-6 font-medium">
              We are not just another marketplace. We are building a digital mandi where:
            </p>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <CheckCircle className="w-6 h-6 text-amber-500 shrink-0 mt-0.5" />
                <span className="text-stone-700">Sellers can reach real buyers easily</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-6 h-6 text-amber-500 shrink-0 mt-0.5" />
                <span className="text-stone-700">Buyers can find trusted listings without worry</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-6 h-6 text-amber-500 shrink-0 mt-0.5" />
                <span className="text-stone-700">Profiles and identities are verified for authenticity</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-6 h-6 text-amber-500 shrink-0 mt-0.5" />
                <span className="text-stone-700">Communication is direct, simple, and secure</span>
              </li>
            </ul>
          </section>

          <section className="bg-stone-900 text-white p-8 rounded-3xl shadow-sm border border-stone-800 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-stone-800 rounded-bl-full opacity-50 -z-0"></div>
            <div className="relative z-10">
              <div className="bg-stone-800 w-12 h-12 rounded-xl flex items-center justify-center mb-6">
                <Heart className="w-6 h-6 text-amber-500" />
              </div>
              <h2 className="text-2xl font-bold mb-4">Our Vision</h2>
              <p className="text-stone-300 leading-relaxed mb-6">
                To become Pakistan's most trusted and user-friendly online marketplace where every transaction is safe, every user is verified, and every deal is transparent.
              </p>
              <p className="text-stone-300 leading-relaxed font-medium">
                We envision a future where online buying and selling feels just as trustworthy as a physical market — or even better.
              </p>
            </div>
          </section>
        </div>

        {/* Join Our Journey */}
        <section className="text-center pt-8">
          <h2 className="text-3xl font-extrabold text-stone-900 mb-4">Join Our Journey</h2>
          <p className="text-stone-600 text-lg mb-8 max-w-2xl mx-auto">
            Whether you are a buyer, seller, or business owner — Mandi.pk is your space to grow, trade, and connect.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/listings" className="px-8 py-4 bg-amber-500 hover:bg-amber-600 text-stone-900 font-bold rounded-xl transition-all shadow-md hover:shadow-lg text-lg w-full sm:w-auto">
              Welcome to Mandi.pk
            </Link>
          </div>
        </section>
        
      </div>
    </div>
  );
}
