import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, where, getDocs, doc, setDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import { SupportTicket } from '../types';
import { Navigate } from 'react-router-dom';
import { CheckCircle, AlertTriangle, Send, History, Image as ImageIcon, X, Paperclip } from 'lucide-react';

export function Support() {
  const { user, loginWithGoogle, isBlocked } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'submit' | 'history'>('submit');
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState<'COMPLAINT' | 'SUGGESTION' | 'QUERY' | 'FEEDBACK' | 'APPEAL'>('FEEDBACK');
  const [message, setMessage] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formSuccess, setFormSuccess] = useState(false);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user && !user.isAnonymous) {
      if (user.displayName) setName(user.displayName);
      fetchTickets();
    }
  }, [user]);

  const fetchTickets = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const q = query(
        collection(db, 'supportTickets'), 
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
      const snap = await getDocs(q);
      setTickets(snap.docs.map(d => ({ ...d.data(), id: d.id } as SupportTicket)));
    } catch (e) {
      console.error(e);
      // Wait for indexes if needed
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Basic validation
    if (!file.type.startsWith('image/')) {
      setFormError('Please select an image file.');
      return;
    }

    if (file.size > 800000) { // ~800KB limit for base64 in Firestore
      setFormError('File size too large. Please select an image under 800KB.');
      return;
    }

    setIsUploading(true);
    setFormError('');

    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachmentUrl(reader.result as string);
        setIsUploading(false);
      };
      reader.onerror = () => {
        setFormError('Failed to read file.');
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error(error);
      setFormError('Error processing image.');
      setIsUploading(false);
    }
  };

  const removeAttachment = () => {
    setAttachmentUrl('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess(false);
    
    if (!user || user.isAnonymous) {
      setFormError('You must be logged in to submit.');
      return;
    }

    if (!name || !subject || !message) {
      setFormError('Name, Subject, and Message are required.');
      return;
    }

    setSubmitting(true);
    try {
      const newRef = doc(collection(db, 'supportTickets'));
      await setDoc(newRef, {
        userId: user.uid,
        name: name,
        email: user.email || '',
        subject: subject,
        category: category,
        message: message,
        status: 'PENDING',
        attachmentUrl: attachmentUrl || null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      setFormSuccess(true);
      setSubject('');
      setMessage('');
      setCategory('FEEDBACK');
      setAttachmentUrl('');
      // refresh tickets
      fetchTickets();
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'supportTickets');
      setFormError('An error occurred while submitting. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!user || user.isAnonymous) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 flex-1 w-full text-center">
        <h1 className="text-3xl font-extrabold text-stone-900 mb-4">Support & Suggestions</h1>
        <p className="text-stone-600 mb-8">Please login to submit support tickets, complaints, or suggestions.</p>
        <button 
          onClick={loginWithGoogle}
          className="inline-flex items-center justify-center px-6 py-3 bg-stone-900 text-white font-bold rounded-lg hover:bg-stone-800 transition-colors"
        >
          Login with Google
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 lg:py-12 flex-1 w-full">
      <div className="mb-8">
        <h1 className="text-3xl lg:text-4xl font-extrabold text-stone-900 mb-2">Support & Suggestions</h1>
        <p className="text-stone-600">We're here to help. Send us your queries, feedback, complaints, or suggestions.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden mb-8">
        <div className="flex border-b border-stone-200">
          <button 
            className={`flex-1 py-4 font-bold text-center border-b-2 transition-colors ${activeTab === 'submit' ? 'border-amber-500 text-amber-600 bg-amber-50/50' : 'border-transparent text-stone-500 hover:text-stone-800 hover:bg-stone-50'}`}
            onClick={() => setActiveTab('submit')}
          >
            <div className="flex items-center justify-center gap-2"><Send className="w-5 h-5"/> Submit Ticket</div>
          </button>
          <button 
            className={`flex-1 py-4 font-bold text-center border-b-2 transition-colors ${activeTab === 'history' ? 'border-amber-500 text-amber-600 bg-amber-50/50' : 'border-transparent text-stone-500 hover:text-stone-800 hover:bg-stone-50'}`}
            onClick={() => setActiveTab('history')}
          >
            <div className="flex items-center justify-center gap-2"><History className="w-5 h-5"/> My History</div>
          </button>
        </div>

        <div className="p-6 md:p-8">
          {activeTab === 'submit' && (
            <div>
              {formSuccess && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg p-4 mb-6 flex items-start gap-3 shadow-sm">
                  <CheckCircle className="w-6 h-6 text-emerald-500 shrink-0" />
                  <div>
                    <h4 className="font-bold">Your message has been submitted successfully!</h4>
                    <p className="text-sm mt-1">Our support team will review it and get back to you soon.</p>
                  </div>
                </div>
              )}

              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 mb-6 flex items-start gap-3 shadow-sm">
                  <AlertTriangle className="w-6 h-6 text-red-500 shrink-0" />
                  <div className="font-medium">{formError}</div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-stone-700 mb-1.5">Full Name *</label>
                    <input 
                      type="text" 
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="w-full px-4 py-2.5 bg-stone-50 border border-stone-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-stone-700 mb-1.5">Email Address</label>
                    <input 
                      type="email" 
                      value={user.email || ''}
                      disabled
                      className="w-full px-4 py-2.5 bg-stone-100 border border-stone-200 rounded-md text-stone-500 cursor-not-allowed"
                    />
                    <p className="text-xs text-stone-500 mt-1">We will contact you on this email</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-stone-700 mb-1.5">Category *</label>
                    <select 
                      value={category}
                      onChange={(e) => setCategory(e.target.value as any)}
                      className="w-full px-4 py-2.5 bg-stone-50 border border-stone-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all appearance-none"
                    >
                      <option value="FEEDBACK">Feedback</option>
                      <option value="COMPLAINT">Complaint</option>
                      <option value="SUGGESTION">Suggestion</option>
                      <option value="QUERY">Query</option>
                      {isBlocked && <option value="APPEAL">Appeal Suspension</option>}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-stone-700 mb-1.5">Subject / Title *</label>
                    <input 
                      type="text" 
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      required
                      className="w-full px-4 py-2.5 bg-stone-50 border border-stone-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all"
                      placeholder="Brief summary of your issue"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-stone-700 mb-1.5">Message / Description *</label>
                  <textarea 
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    required
                    rows={6}
                    className="w-full px-4 py-3 bg-stone-50 border border-stone-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all resize-y"
                    placeholder="Provide as much detail as possible..."
                  ></textarea>
                </div>

                <div>
                  <label className="block text-sm font-bold text-stone-700 mb-1.5">Attach Image / Screenshot (Optional)</label>
                  
                  {!attachmentUrl ? (
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="cursor-pointer group flex flex-col items-center justify-center border-2 border-dashed border-stone-300 rounded-xl py-8 px-4 bg-stone-50 hover:bg-stone-100 hover:border-amber-400 transition-all"
                    >
                      <ImageIcon className="w-10 h-10 text-stone-400 group-hover:text-amber-500 mb-3 transition-colors" />
                      <p className="text-stone-600 font-medium">Click to upload image</p>
                      <p className="text-stone-400 text-xs mt-1">PNG, JPG or JPEG up to 800KB</p>
                    </div>
                  ) : (
                    <div className="relative inline-block mt-2">
                       <img 
                         src={attachmentUrl} 
                         alt="Attachment preview" 
                         className="h-32 w-auto object-cover rounded-lg border border-stone-200 shadow-sm"
                       />
                       <button
                         type="button"
                         onClick={removeAttachment}
                         className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-lg hover:bg-red-600 transition-colors"
                       >
                         <X className="w-4 h-4" />
                       </button>
                    </div>
                  )}

                  <input 
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    className="hidden"
                  />
                  <p className="text-xs text-stone-500 mt-2">Maximum file size: 800KB (for best performance)</p>
                </div>

                <div className="pt-4 flex justify-end">
                  <button 
                    type="submit" 
                    disabled={submitting || isUploading}
                    className={`px-8 py-3 rounded-md font-bold text-white shadow-sm transition-all focus:ring-2 focus:ring-offset-2 focus:ring-stone-900 ${submitting || isUploading ? 'bg-stone-500 cursor-not-allowed' : 'bg-stone-900 hover:bg-stone-800'}`}
                  >
                    {submitting ? 'Submitting...' : isUploading ? 'Processing Image...' : 'Submit Message'}
                  </button>
                </div>

              </form>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-4">
              {loading ? (
                <div className="py-12 text-center text-stone-500">Loading history...</div>
              ) : tickets.length === 0 ? (
                <div className="py-12 text-center text-stone-500">
                  <History className="w-12 h-12 mx-auto mb-4 text-stone-300" />
                  <p>You haven't submitted any support tickets yet.</p>
                </div>
              ) : (
                tickets.map(ticket => (
                  <div key={ticket.id} className="border border-stone-200 rounded-lg p-5 hover:bg-stone-50 transition-colors">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold uppercase tracking-wider text-stone-500 bg-stone-200 px-2 py-0.5 rounded-sm">{ticket.category}</span>
                          <h4 className="font-bold text-lg text-stone-900">{ticket.subject}</h4>
                        </div>
                        <p className="text-stone-600 text-sm mb-3">Submitted on {ticket.createdAt?.toDate().toLocaleDateString()}</p>
                        <p className="text-stone-800 whitespace-pre-wrap">{ticket.message}</p>
                        {ticket.attachmentUrl && (
                          <div className="mt-4">
                            <p className="text-xs font-bold text-stone-500 uppercase tracking-widest mb-2">Attached Reference:</p>
                            <a href={ticket.attachmentUrl} target="_blank" rel="noopener noreferrer" className="block w-fit group">
                              <img 
                                src={ticket.attachmentUrl} 
                                alt="Attachment" 
                                className="h-24 w-auto rounded-lg border border-stone-200 shadow-sm hover:ring-2 hover:ring-amber-500 transition-all"
                              />
                              <span className="text-amber-600 hover:underline text-xs font-medium block mt-1">
                                Click to view full size
                              </span>
                            </a>
                          </div>
                        )}
                      </div>
                      <div className="md:text-right shrink-0">
                         <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold shadow-sm ${
                           ticket.status === 'PENDING' ? 'bg-amber-100 text-amber-800' :
                           ticket.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                           'bg-emerald-100 text-emerald-800'
                         }`}>
                           {ticket.status.replace('_', ' ')}
                         </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
