import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { FAQ } from '../types';
import { useAuth } from '../context/AuthContext';
import { ChevronDown, ChevronUp, Plus, Edit2, Trash2 } from 'lucide-react';

const DEFAULT_FAQS: Omit<FAQ, 'id' | 'updatedAt'>[] = [
  {
    question: "How do I buy or sell items on Mandi.pk?",
    answer: "To sell, simply click the 'Sell Your Item' button in the header (Login required). Fill in the product details, set a price, and upload clear photos. To buy, browse the 'Marketplace', click on a listing you like, and use the 'Book Your Order' button for Cash on Delivery or 'Chat in App' to talk directly with the seller.",
    order: 1
  },
  {
    question: "What is the Verified & Premium Seller badge?",
    answer: "Our verification system confirms merchant identities to build trust. Once verified, your profile information is locked to prevent identity spoofing. We offer Basic (Blue), Golden, and Premium (Crown) badges. Premium sellers get 3x more visibility and priority support. You can apply via the 'Badges' tab in your Profile.",
    order: 2
  },
  {
    question: "Why can't I edit my profile information?",
    answer: "If you have an active Verified or Premium badge, your identity information (Name, Phone, City, Address) is locked to protect buyers and maintain platform integrity. You can update your profile once your current badge expires. This ensures that the person buyers are dealing with is exactly who they verified themselves to be.",
    order: 3
  },
  {
    question: "How does the 'Book Your Order' (COD) process work?",
    answer: "When you click 'Book Your Order', you provide your delivery address and contact details. The seller is instantly notified. They will then ship the item to you, and you pay in cash upon delivery. You can track your bookings in the 'Buyer Profile' section.",
    order: 4
  },
  {
    question: "What happens if I mark an item as 'Sold Out'?",
    answer: "Sellers can mark their own items as Sold Out once they complete a sale (via Mandi, WhatsApp, or Call). Sold items move to the 'Sold Out' category where they remain visible for reference but cannot be boosted or promoted. Only Mandi administrators can remove items from the Sold Out section.",
    order: 5
  },
  {
    question: "Is there any support available for users?",
    answer: "Yes! You can use the 'Support' section in the bottom menu to submit a ticket. Whether it's a technical query, a complaint about a fraudulent listing, or a suggestion, our specialized team reviews all tickets and responds promptly.",
    order: 6
  },
  {
    question: "How does the Referral System work?",
    answer: "Every user has a unique referral link on their Profile page. If you invite 10 friends using this link, and they sign in, you will automatically receive a free Basic (Blue) Verified Badge! You can track your successful referrals directly from your profile dashboard.",
    order: 7
  }
];

export function FAQs() {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [openFaq, setOpenFaq] = useState<string | null>(null);
  const { isAdmin } = useAuth();

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<FAQ>>({});

  useEffect(() => {
    fetchFaqs();
  }, []);

  const fetchFaqs = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'faqs'), orderBy('order', 'asc'));
      const snap = await getDocs(q);
      
      if (snap.empty) {
        // Seed default faqs
        const seededFaqs: FAQ[] = [];
        for (const f of DEFAULT_FAQS) {
          const newDoc = doc(collection(db, 'faqs'));
          const item = { ...f, id: newDoc.id, updatedAt: serverTimestamp() };
          // Don't auto-seed in db to save writes, just use locally until admin saves
          seededFaqs.push(item as FAQ);
        }
        setFaqs(seededFaqs);
      } else {
        setFaqs(snap.docs.map(d => ({ ...d.data(), id: d.id } as FAQ)));
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, 'faqs');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    try {
      const isNew = !editForm.id;
      const docRef = isNew ? doc(collection(db, 'faqs')) : doc(db, 'faqs', editForm.id as string);
      
      await setDoc(docRef, {
        question: editForm.question,
        answer: editForm.answer,
        order: Number(editForm.order || 0),
        updatedAt: serverTimestamp()
      }, { merge: true });
      
      setIsEditing(false);
      setEditForm({});
      fetchFaqs();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'faqs');
    }
  };

  const handleDelete = async (id: string) => {
    if (!isAdmin || !confirm('Are you sure you want to delete this FAQ?')) return;
    try {
      await deleteDoc(doc(db, 'faqs', id));
      fetchFaqs();
    } catch (error) {
       handleFirestoreError(error, OperationType.DELETE, `faqs/${id}`);
    }
  };

  const toggleFaq = (id: string) => {
    setOpenFaq(openFaq === id ? null : id);
  };

  if (loading) return <div className="py-20 text-center text-stone-500">Loading FAQs...</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 flex-1 relative">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-stone-900">Frequently Asked Questions</h1>
        {isAdmin && !isEditing && (
          <button 
            onClick={() => { setEditForm({ order: faqs.length + 1 }); setIsEditing(true); }}
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-stone-900 px-4 py-2 rounded-md font-bold transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" /> Add FAQ
          </button>
        )}
      </div>

      {isEditing && isAdmin ? (
        <div className="bg-stone-50 border border-stone-200 p-6 rounded-xl shadow-sm mb-8">
           <h3 className="text-lg font-bold text-stone-900 mb-4">{editForm.id ? 'Edit FAQ' : 'New FAQ'}</h3>
           <form onSubmit={handleSave} className="space-y-4">
             <div>
               <label className="block text-sm font-medium text-stone-700 mb-1">Question</label>
               <input required type="text" value={editForm.question || ''} onChange={e => setEditForm({...editForm, question: e.target.value})} className="w-full p-2.5 border border-stone-300 rounded leading-5 bg-white focus:ring-amber-500 focus:border-amber-500" />
             </div>
             <div>
               <label className="block text-sm font-medium text-stone-700 mb-1">Answer (Markdown not supported yet)</label>
               <textarea required rows={4} value={editForm.answer || ''} onChange={e => setEditForm({...editForm, answer: e.target.value})} className="w-full p-2.5 border border-stone-300 rounded leading-5 bg-white focus:ring-amber-500 focus:border-amber-500"></textarea>
             </div>
             <div>
               <label className="block text-sm font-medium text-stone-700 mb-1">Display Order</label>
               <input required type="number" value={editForm.order || ''} onChange={e => setEditForm({...editForm, order: Number(e.target.value)})} className="w-32 p-2.5 border border-stone-300 rounded leading-5 bg-white focus:ring-amber-500 focus:border-amber-500" />
             </div>
             <div className="flex justify-end gap-3 pt-2 border-t border-stone-200">
               <button type="button" onClick={() => { setIsEditing(false); setEditForm({}); }} className="px-4 py-2 text-stone-600 font-bold hover:bg-stone-200 rounded transition-colors">Cancel</button>
               <button type="submit" className="px-4 py-2 bg-stone-900 text-white font-bold rounded shadow-sm hover:bg-stone-800 transition-colors">Save FAQ</button>
             </div>
           </form>
        </div>
      ) : null}

      <div className="space-y-3">
        {faqs.map((faq) => {
          const isOpen = openFaq === faq.id;
          return (
            <div key={faq.id} className="bg-white rounded-lg shadow-sm border border-stone-200 overflow-hidden transition-all duration-200">
              <div 
                className="w-full p-4 sm:p-6 text-left flex justify-between items-center cursor-pointer hover:bg-stone-50 select-none group"
                onClick={() => toggleFaq(faq.id)}
              >
                <h3 className="font-bold text-lg text-stone-900 pr-8">{faq.question}</h3>
                <div className="text-stone-400 group-hover:text-amber-500 transition-colors shrink-0">
                  {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </div>
              </div>
              
              {isOpen && (
                <div className="px-4 sm:px-6 pb-6 pt-2 border-t border-stone-100 bg-stone-50/50">
                  <p className="text-stone-600 whitespace-pre-wrap leading-relaxed">{faq.answer}</p>
                  
                  {isAdmin && (
                    <div className="mt-4 pt-4 border-t border-stone-200 flex justify-end gap-2">
                       <button onClick={(e) => { e.stopPropagation(); setEditForm(faq); setIsEditing(true); }} className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Edit">
                          <Edit2 className="w-4 h-4" />
                       </button>
                       <button onClick={(e) => { e.stopPropagation(); handleDelete(faq.id); }} className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors" title="Delete">
                          <Trash2 className="w-4 h-4" />
                       </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {faqs.length === 0 && !isEditing && (
           <div className="py-20 text-center text-stone-500">No FAQs available at the moment.</div>
        )}
      </div>
    </div>
  );
}
