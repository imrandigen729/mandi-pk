import React from 'react';
import { motion } from 'motion/react';
import { Shield, Lock, Eye, CheckCircle } from 'lucide-react';

export default function Privacy() {
  return (
    <div className="min-h-screen bg-stone-50 py-20 px-4">
      <div className="max-w-4xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[3rem] p-8 md:p-16 shadow-xl shadow-stone-200 border border-stone-100"
        >
          <div className="flex items-center gap-4 mb-8">
            <div className="p-4 bg-emerald-500 rounded-2xl">
              <Lock className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-black text-stone-900 italic tracking-tighter uppercase">Privacy System</h1>
              <p className="text-stone-400 font-bold uppercase tracking-widest text-xs">Your security is our priority</p>
            </div>
          </div>

          <div className="prose prose-stone max-w-none space-y-12">
            <section>
              <h2 className="text-2xl font-black text-stone-900 uppercase tracking-tight flex items-center gap-3 italic">
                <div className="w-2 h-8 bg-emerald-500" /> Data Protection Overview
              </h2>
              <p className="text-stone-600 leading-relaxed font-medium">
                At Mandi.pk, we implement industry-standard encryption and safety protocols to protect your personal data. We collect information only necessary to facilitate secure trading and verify seller authenticity.
              </p>
            </section>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-12">
               {[
                 { icon: Eye, title: "Transparency", desc: "Know what data we collect and why." },
                 { icon: Lock, title: "Security", desc: "End-to-end encryption for your messages." },
                 { icon: Shield, title: "Integrity", desc: "Your data is never sold to third parties." }
               ].map((box, i) => (
                 <div key={i} className="bg-stone-50 p-6 rounded-3xl border border-stone-100 flex flex-col items-center text-center">
                    <box.icon className="w-8 h-8 text-emerald-500 mb-4" />
                    <h3 className="font-black text-stone-900 uppercase text-xs tracking-widest mb-2">{box.title}</h3>
                    <p className="text-stone-500 text-[10px] font-medium leading-tight">{box.desc}</p>
                 </div>
               ))}
            </div>

            <section>
              <h2 className="text-2xl font-black text-stone-900 uppercase tracking-tight flex items-center gap-3 italic">
                <div className="w-2 h-8 bg-emerald-500" /> Information We Collect
              </h2>
              <div className="space-y-4">
                {[
                  "Account profiles (name, email, phone number)",
                  "Listing details and product media",
                  "Chat communication logs for security auditing",
                  "Verified seller documentation (strictly confidential)"
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 bg-emerald-50/30 rounded-2xl border border-emerald-100">
                    <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
                    <span className="text-sm font-bold text-stone-700">{item}</span>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-black text-stone-900 uppercase tracking-tight flex items-center gap-3 italic">
                <div className="w-2 h-8 bg-emerald-500" /> Your Rights
              </h2>
              <p className="text-stone-600 leading-relaxed font-medium">
                You have the right to access, modify, or request the deletion of your account. In line with the Admin Dashboard features, account deletion purges all your data from our active systems, ensuring your right to be forgotten.
              </p>
            </section>
          </div>

          <div className="mt-16 pt-8 border-t border-stone-100 flex items-center justify-between">
            <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">
              Secured by Mandi.pk Guard System
            </p>
            <div className="flex items-center gap-4">
              <span className="text-[10px] font-black uppercase text-emerald-500 tracking-widest bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">PCI Compliant</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
