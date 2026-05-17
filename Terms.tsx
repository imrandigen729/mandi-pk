import React from 'react';
import { motion } from 'motion/react';
import { FileText, Shield, CheckCircle, Clock } from 'lucide-react';

export default function Terms() {
  return (
    <div className="min-h-screen bg-stone-50 py-20 px-4">
      <div className="max-w-4xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[3rem] p-8 md:p-16 shadow-xl shadow-stone-200 border border-stone-100"
        >
          <div className="flex items-center gap-4 mb-8">
            <div className="p-4 bg-amber-500 rounded-2xl">
              <FileText className="w-8 h-8 text-stone-900" />
            </div>
            <div>
              <h1 className="text-4xl font-black text-stone-900 italic tracking-tighter uppercase">Terms & Conditions</h1>
              <p className="text-stone-400 font-bold uppercase tracking-widest text-xs">Last Updated: May 2026</p>
            </div>
          </div>

          <div className="prose prose-stone max-w-none space-y-12">
            <section>
              <h2 className="text-2xl font-black text-stone-900 uppercase tracking-tight flex items-center gap-3 italic">
                <div className="w-2 h-8 bg-amber-500" /> 1. Acceptance of Terms
              </h2>
              <p className="text-stone-600 leading-relaxed font-medium">
                By accessing or using Mandi.pk, you agree to be bound by these Terms and Conditions. Our platform connects buyers and sellers of agricultural products and livestock. We are a marketplace provider, not a principal party to transactions.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-black text-stone-900 uppercase tracking-tight flex items-center gap-3 italic">
                <div className="w-2 h-8 bg-amber-500" /> 2. User Responsibilities
              </h2>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 list-none p-0">
                {[
                  "Provide accurate and real information.",
                  "Respect other community members.",
                  "Fair pricing for all listings.",
                  "Compliance with local livestock laws."
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 bg-stone-50 p-4 rounded-2xl border border-stone-100">
                    <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
                    <span className="text-sm font-bold text-stone-700">{item}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section>
               <h3 className="text-xl font-black text-stone-900 uppercase italic mb-4">3. Prohibited Activities</h3>
               <div className="bg-red-50 p-8 rounded-3xl border-2 border-red-100 space-y-4">
                  <p className="text-red-900 text-sm font-bold leading-relaxed">
                    Mandi.pk maintains a zero-tolerance policy for:
                  </p>
                  <ul className="text-red-700 text-xs font-black uppercase tracking-widest space-y-2 list-disc pl-5">
                    <li>Fraudulent or misleading listing data</li>
                    <li>Harassment or abusive language in chats</li>
                    <li>Trading of prohibited or illegal substances</li>
                    <li>Spamming or system manipulation</li>
                  </ul>
               </div>
            </section>

            <section>
              <h2 className="text-2xl font-black text-stone-900 uppercase tracking-tight flex items-center gap-3 italic">
                <div className="w-2 h-8 bg-amber-500" /> 4. Platform Role
              </h2>
              <p className="text-stone-600 leading-relaxed font-medium">
                Mandi.pk facilitates connections. We do not guarantee the quality, safety, or legality of items advertised. Transaction fulfillment and offline meetings are at the sole risk of the involved parties.
              </p>
            </section>
          </div>

          <div className="mt-16 pt-8 border-t border-stone-100 flex items-center justify-between">
            <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">
              © 2026 Mandi.pk • Secure Marketplace
            </p>
            <div className="flex items-center gap-2 text-emerald-600">
              <Shield className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-widest">Verified Policy</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
