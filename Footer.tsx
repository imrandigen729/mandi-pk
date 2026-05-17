import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Facebook, 
  Twitter, 
  Instagram, 
  ArrowUp, 
  Search,
  ShieldCheck,
  MessageCircle,
  HelpCircle,
  FileText,
  Lock as LockIcon,
  PlusCircle
} from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-stone-900 text-white pt-10 pb-24 relative overflow-hidden">
      {/* 
        NOTE: pb-24 is added to give space for the fixed Mobild Navigation Bar.
        The footer itself is now more compact as requested.
      */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-stone-700 to-transparent" />
      
      <div className="max-w-[1440px] mx-auto px-4 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 py-8 border-b border-white/5">
          {/* Brand Column */}
          <div className="space-y-4">
             <Link to="/">
                <img src="/logo.png" alt="Mandi.pk" className="h-6 w-auto brightness-0 invert opacity-60 hover:opacity-100 transition-opacity" />
             </Link>
             <p className="text-[10px] text-stone-500 font-bold uppercase tracking-widest leading-relaxed max-w-[200px]">
               Pakistan's premium marketplace for quality livestock.
             </p>
             <div className="flex items-center gap-2">
               {[Facebook, Twitter, Instagram].map((Icon, i) => (
                 <a key={i} href="#" className="p-2 bg-white/5 rounded-lg text-stone-500 hover:bg-amber-500 hover:text-stone-900 transition-all">
                   <Icon className="w-3 h-3" />
                 </a>
               ))}
             </div>
          </div>

          {/* Navigation Columns */}
          {[
            {
              title: "Market",
              links: [
                { to: "/listings", label: "Search", icon: Search },
                { to: "/verified", label: "Verified", icon: ShieldCheck },
                { to: "/messages", label: "Chats", icon: MessageCircle }
              ]
            },
            {
              title: "Legals",
              links: [
                { to: "/terms", label: "Terms", icon: FileText },
                { to: "/privacy", label: "Privacy", icon: LockIcon }
              ]
            }
          ].map((col, i) => (
            <div key={i} className="space-y-4">
              <h4 className="text-[9px] font-black uppercase tracking-[0.2em] text-stone-600">{col.title}</h4>
              <ul className="space-y-2">
                {col.links.map((link, j) => (
                  <li key={j}>
                    <Link to={link.to} className="flex items-center gap-2 text-stone-400 hover:text-amber-500 transition-colors group">
                      <link.icon className="w-3 h-3 group-hover:rotate-12 transition-transform" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">{link.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Actions Column */}
          <div className="flex flex-col gap-3 justify-center">
            <Link to="/submit" className="flex items-center justify-center gap-2 px-6 py-3 bg-amber-500 text-stone-900 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-white transition-all shadow-lg shadow-amber-500/10">
              <PlusCircle className="w-3.5 h-3.5" /> Post Now
            </Link>
            <Link to="/support" className="flex items-center justify-center gap-2 px-6 py-3 bg-stone-800 text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-stone-700 transition-all">
              <MessageCircle className="w-3.5 h-3.5" /> Support
            </Link>
            <Link to="/faqs" className="flex items-center justify-center gap-2 px-6 py-3 bg-stone-100/10 text-stone-400 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-white/10 transition-all">
              <HelpCircle className="w-3.5 h-3.5" /> FAQs
            </Link>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[9px] font-black uppercase tracking-[0.3em] text-stone-700">
            &copy; {new Date().getFullYear()} Mandi.pk • Secure Trade
          </p>
          <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="p-2.5 bg-white/5 rounded-lg text-stone-700 hover:text-white transition-colors group">
            <ArrowUp className="w-3.5 h-3.5 group-hover:-translate-y-0.5 transition-transform" />
          </button>
        </div>
      </div>
    </footer>
  );
}
