import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Upload, X, Info, Sparkles, ChevronRight, ChevronLeft, CheckCircle } from 'lucide-react';
import { CATEGORIES, CATEGORIES_WITH_SUBCATEGORIES } from '../lib/categories';
import { UserProfile } from '../types';

import { CATEGORY_FIELDS } from '../lib/categoryFields';
import { formatPKR } from '../lib/utils';

type FormData = {
  title: string;
  description: string;
  category: string;
  subcategory: string;
  condition: 'New' | 'Used' | 'Not Applicable';
  price: number;
  quantity: number;
  shippingCharges: number;
  sellerName: string;
  phoneNumber: string;
  whatsappNumber: string;
  city: string;
  locationArea: string;
  customFields?: Record<string, any>;
};

export function SubmitListing() {
  const { user, authError, loginWithGoogle, isBlocked } = useAuth();
  const navigate = useNavigate();
  
  const [step, setStep] = useState(1);
  const [images, setImages] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const { register, handleSubmit, watch, formState: { errors }, setValue, trigger } = useForm<FormData>({
    defaultValues: { category: '', subcategory: '', condition: 'Not Applicable', quantity: 1, shippingCharges: 0 }
  });

  useEffect(() => {
    async function prefillProfile() {
      if (user && !user.isAnonymous) {
        try {
          const profileDoc = await getDoc(doc(db, 'users', user.uid));
          if (profileDoc.exists()) {
            const data = profileDoc.data() as UserProfile;
            if (data.name) setValue('sellerName', data.name);
            if (data.phoneNumber) setValue('phoneNumber', data.phoneNumber);
            if (data.city) setValue('city', data.city);
            if (data.address) setValue('locationArea', data.address);
          } else if (user.displayName) {
             setValue('sellerName', user.displayName);
          }
        } catch (e) {
          console.error('Failed to prefill profile:', e);
        }
      }
    }
    prefillProfile();
  }, [user, setValue]);

  const selectedCategory = watch('category');
  const selectedSubcategory = watch('subcategory');

  const subcategories = CATEGORIES_WITH_SUBCATEGORIES[selectedCategory] || [];

  // Reset subcategory when category changes
  React.useEffect(() => {
    if (subcategories.length > 0) {
      if (!subcategories.includes(selectedSubcategory)) {
        setValue('subcategory', subcategories[0]);
      }
    } else {
      setValue('subcategory', '');
    }
  }, [selectedCategory, setValue, subcategories]);

  const resizeImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new window.Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
      };
      reader.onerror = error => reject(error);
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    
    if (images.length + files.length > 10) {
      alert('Maximum 10 images allowed');
      return;
    }

    try {
      const resizedImages = await Promise.all(files.map(resizeImage));
      setImages(prev => [...prev, ...resizedImages]);
    } catch (err) {
      console.error(err);
      alert('Error processing images');
    }
  };

  const handlePaymentProofUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    try {
      await resizeImage(e.target.files[0]);
      // setPaymentProof(resized); // Removed
    } catch (err) {
      console.error(err);
      alert('Error processing payment proof');
    }
  };

  const handleNextStep = async () => {
    let isValid = false;
    
    if (step === 1) {
      isValid = await trigger(['category']);
      if (isValid && !selectedCategory) {
        setError('Please select a category');
        isValid = false;
      } else {
        setError('');
      }
    } else if (step === 2) {
      if (images.length === 0) {
        setError('Please upload at least one image of the item. This is required to process to the next step.');
        isValid = false;
      } else {
        setError('');
        isValid = true;
      }
    } else if (step === 3) {
      isValid = await trigger(['title', 'price', 'condition']);
      
      // Also trigger validation for custom fields if any
      const categoryFields = CATEGORY_FIELDS[selectedCategory] || [];
      const customFieldNames = categoryFields.filter(f => f.required).map(f => `customFields.${f.name}` as keyof FormData);
      if (customFieldNames.length > 0) {
        const customValid = await trigger(customFieldNames);
        isValid = isValid && customValid;
      }

    } else if (step === 4) {
      isValid = await trigger(['description', 'sellerName', 'phoneNumber', 'city', 'locationArea']);
    } else if (step === 5) {
      isValid = true; // Review & Plan is simple form submit
    }

    if (isValid) {
      setError('');
      setStep(prev => prev + 1);
    }
  };

  const onSubmit = async (data: FormData) => {
    if (images.length === 0) {
      setError('Please upload at least one image of the item.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const listingRef = doc(collection(db, 'listings'));
      
      const listingData: any = {
        title: data.title,
        description: data.description,
        category: data.category,
        condition: data.condition,
        price: Number(data.price),
        quantity: Number(data.quantity) || 1,
        shippingCharges: Number(data.shippingCharges) || 0,
        images: images,
        sellerName: data.sellerName,
        phoneNumber: data.phoneNumber,
        whatsappNumber: data.phoneNumber, // Default to phone number
        city: data.city,
        locationArea: data.locationArea || '',
        customFields: data.customFields || {},
        status: 'LIVE', // New listings are live instantly
        ownerId: user?.uid || 'guest',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        views: 0,
        saves: 0,
        isFeatured: false,
        isBoosted: false,
        promotionStatus: 'NONE'
      };
      
      if (data.subcategory) {
        listingData.subcategory = data.subcategory;
      }

      await setDoc(listingRef, listingData);
      setSuccess(true);
      setStep(6);
    } catch (err: any) {
      handleFirestoreError(err, OperationType.CREATE, 'listings');
    } finally {
      setSubmitting(false);
    }
  };

  if (isBlocked) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="bg-white p-8 border rounded-xl shadow-sm flex flex-col items-center border-red-200">
          <X className="w-16 h-16 text-red-500 mb-4" />
          <h1 className="text-3xl font-bold text-stone-900 mb-2">Account Restricted</h1>
          <p className="text-stone-600 mb-8 leading-relaxed">
            Your account has been restricted by the administration. You currently do not have permission to post new items. Please check your account status or contact support if you believe this is an error.
          </p>
          <button onClick={() => navigate('/')} className="w-full bg-stone-900 text-white font-bold py-3 px-4 rounded hover:bg-stone-800 transition-colors">
            Return to Marketplace
          </button>
        </div>
      </div>
    );
  }

  if (success && step === 6) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="bg-white p-8 border rounded-xl shadow-sm flex flex-col items-center">
          <CheckCircle className="w-16 h-16 text-emerald-500 mb-4" />
          <h1 className="text-3xl font-bold text-stone-900 mb-2">Ad Submitted!</h1>
          <p className="text-stone-600 mb-8">
            Your listing has been submitted successfully and is now live.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 w-full">
            <button onClick={() => navigate('/listings')} className="flex-1 bg-stone-100 text-stone-700 font-bold py-3 px-4 rounded hover:bg-stone-200 transition-colors">
              Explore Listings
            </button>
            <button onClick={() => navigate('/dashboard')} className="flex-1 bg-amber-500 text-stone-900 font-bold py-3 px-4 rounded hover:bg-amber-600 transition-colors">
              Seller Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-stone-800">Post your ad</h1>
        <div className="text-sm font-medium text-stone-400 bg-white px-3 py-1 rounded-full border">Step {step} of 5</div>
      </div>
      
      {(!user || user.isAnonymous) && (
        <div className="bg-blue-50 border-l-4 border-blue-500 text-blue-700 p-4 mb-6 rounded shadow-sm">
          <p className="font-bold">Submitting as Guest</p>
          <p className="text-sm">You are not logged in. If you want to view your uploaded items in your "Seller Dashboard", please <button type="button" onClick={loginWithGoogle} className="underline font-bold">Login first</button> before submitting.</p>
        </div>
      )}

      {authError && (
        <div className="bg-red-50 text-red-600 p-4 rounded-md mb-6 border border-red-200">
          <strong>Authentication Error:</strong> {authError}
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-md mb-6 border border-red-200">
          {error}
        </div>
      )}

      <div className="w-full bg-stone-200 h-2 rounded-full mb-8 overflow-hidden">
        <div className="bg-amber-500 h-full transition-all duration-300" style={{ width: `${(step / 5) * 100}%`}}></div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="bg-white p-6 rounded-lg shadow-sm border border-stone-200">
        
        {/* STEP 1: CATEGORY & SUBCATEGORY */}
        {step === 1 && (
          <div className="space-y-6 min-h-[300px]">
             <h2 className="text-xl font-bold text-stone-800">What are you offering?</h2>
             <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
               {CATEGORIES.map(cat => (
                 <label key={cat} className={`border rounded-lg p-4 cursor-pointer text-center transition-all ${selectedCategory === cat ? 'border-amber-500 bg-amber-50 ring-1 ring-amber-500' : 'border-stone-200 hover:border-amber-300'}`}>
                   <input type="radio" value={cat} {...register('category')} className="hidden" />
                   <span className="block text-sm font-medium text-stone-800">{cat}</span>
                 </label>
               ))}
             </div>
             
             {subcategories.length > 0 && selectedCategory && (
                <div className="pt-4 border-t border-stone-100 animate-in fade-in slide-in-from-bottom-2">
                  <h3 className="text-md font-semibold text-stone-700 mb-3">Select Subcategory</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {subcategories.map(sub => (
                      <label key={sub} className={`border rounded-lg p-3 cursor-pointer text-center transition-all ${selectedSubcategory === sub ? 'border-amber-500 bg-amber-50 text-amber-900 ring-1 ring-amber-500' : 'border-stone-200 hover:border-amber-200 text-stone-600'}`}>
                        <input type="radio" value={sub} {...register('subcategory')} className="hidden" />
                        <span className="block text-sm font-medium">{sub}</span>
                      </label>
                    ))}
                  </div>
                </div>
             )}
          </div>
        )}

        {/* STEP 2: UPLOAD IMAGES */}
        {step === 2 && (
          <div className="space-y-6 min-h-[300px]">
             <div>
               <h2 className="text-xl font-bold text-stone-800">Upload Photos</h2>
               <p className="text-stone-500 text-sm mt-1">Ads with high quality photos get 10x more responses. You can add up to 10 photos.</p>
             </div>
             
             <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                {images.map((img, i) => (
                  <div key={i} className={`relative aspect-square border rounded-md overflow-hidden ${i === 0 ? 'ring-2 ring-amber-500' : ''}`}>
                    <img src={img} alt="preview" className="object-cover w-full h-full" />
                    {i === 0 && <span className="absolute bottom-0 inset-x-0 bg-amber-500/90 text-center text-[10px] uppercase font-bold text-white py-1">Cover</span>}
                    <button 
                      type="button" 
                      onClick={() => setImages(images.filter((_, idx) => idx !== i))}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors shadow"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {images.length < 10 && (
                  <label className="aspect-square border-2 border-dashed border-stone-300 rounded flex flex-col items-center justify-center cursor-pointer hover:border-amber-500 hover:bg-amber-50 transition-colors text-stone-500">
                    <Upload className="w-6 h-6 mb-2 text-stone-400" />
                    <span className="text-xs font-medium">Add Photo</span>
                    <input type="file" multiple accept="image/*" className="hidden" onChange={handleImageUpload} />
                  </label>
                )}
             </div>
          </div>
        )}

        {/* STEP 3: DETAILS */}
        {step === 3 && (
          <div className="space-y-6 min-h-[300px]">
            <h2 className="text-xl font-bold text-stone-800">Item Details</h2>
            
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Ad Title *</label>
              <input 
                {...register('title', { required: true, maxLength: 200 })} 
                className={`w-full border-stone-300 rounded-md shadow-sm focus:border-amber-500 focus:ring-amber-500 p-2.5 border ${errors.title ? 'border-red-500' : ''}`}
                placeholder="Key features, brand, condition..."
              />
              {errors.title && <span className="text-red-500 text-xs mt-1">Title is required.</span>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Price (Rs) *</label>
                <input 
                  type="number" 
                  {...register('price', { required: true, min: 0 })} 
                  className={`w-full border-stone-300 rounded-md shadow-sm focus:border-amber-500 focus:ring-amber-500 p-2.5 border ${errors.price ? 'border-red-500' : ''}`}
                  placeholder="Set a competitive price"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Stock Quantity *</label>
                <input 
                  type="number" 
                  {...register('quantity', { required: true, min: 1 })} 
                  className={`w-full border-stone-300 rounded-md shadow-sm focus:border-amber-500 focus:ring-amber-500 p-2.5 border ${errors.quantity ? 'border-red-500' : ''}`}
                  placeholder="Available stock"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Shipping Charges (Rs) *</label>
                <input 
                  type="number" 
                  {...register('shippingCharges', { required: true, min: 0 })} 
                  className={`w-full border-stone-300 rounded-md shadow-sm focus:border-amber-500 focus:ring-amber-500 p-2.5 border ${errors.shippingCharges ? 'border-red-500' : ''}`}
                  placeholder="Shipping cost"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Condition *</label>
                <select 
                  {...register('condition', { required: true })} 
                  className="w-full border-stone-300 rounded-md shadow-sm focus:border-amber-500 focus:ring-amber-500 p-2.5 border bg-white"
                >
                  <option value="New">New</option>
                  <option value="Used">Used</option>
                  <option value="Not Applicable">Not Applicable</option>
                </select>
              </div>
            </div>

            {CATEGORY_FIELDS[selectedCategory] && CATEGORY_FIELDS[selectedCategory].length > 0 && (
              <div className="pt-4 border-t mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="col-span-full">
                  <h3 className="font-semibold text-stone-700 text-sm uppercase tracking-wider">Specific Details</h3>
                </div>
                {CATEGORY_FIELDS[selectedCategory].map(field => (
                  <div key={field.name}>
                    <label className="block text-sm font-medium text-stone-700 mb-1">{field.label} {field.required && '*'}</label>
                    {field.type === 'select' ? (
                      <select 
                        {...register(`customFields.${field.name}` as any, { required: field.required })} 
                        className={`w-full border-stone-300 rounded-md shadow-sm focus:border-amber-500 focus:ring-amber-500 p-2.5 border bg-white ${errors.customFields?.[field.name] ? 'border-red-500' : ''}`}
                      >
                        <option value="">Select option</option>
                        {field.options?.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : (
                      <input 
                        type={field.type}
                        {...register(`customFields.${field.name}` as any, { required: field.required })} 
                        className={`w-full border-stone-300 rounded-md shadow-sm focus:border-amber-500 focus:ring-amber-500 p-2.5 border ${errors.customFields?.[field.name] ? 'border-red-500' : ''}`}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* STEP 4: DESCRIPTION & LOCATION */}
        {step === 4 && (
          <div className="space-y-6 min-h-[300px]">
            <h2 className="text-xl font-bold text-stone-800">Description & Location</h2>
            
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Description *</label>
              <textarea 
                {...register('description', { required: true })} 
                rows={4}
                className={`w-full border-stone-300 rounded-md shadow-sm focus:border-amber-500 focus:ring-amber-500 p-2 border ${errors.description ? 'border-red-500' : ''}`}
                placeholder="Describe your item, condition, reason for selling, and any important details..."
              />
            </div>

            <div className="pt-4 border-t">
              <h3 className="font-semibold text-stone-800 mb-4 text-lg">Contact & Location</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Your Name *</label>
                  <input {...register('sellerName', { required: true })} className="w-full border p-2.5 rounded-md" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Phone Number (WhatsApp) *</label>
                  <input {...register('phoneNumber', { required: true })} className="w-full border p-2.5 rounded-md" placeholder="e.g. +92 3XX XXXXXXX" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">City *</label>
                  <input {...register('city', { required: true })} className="w-full border p-2.5 rounded-md" placeholder="e.g. Lahore, Karachi" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Location / Area</label>
                  <input {...register('locationArea')} className="w-full border p-2.5 rounded-md" placeholder="e.g. DHA, Gulberg" />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t">
              <h3 className="font-semibold text-stone-800 mb-4 text-lg">Payment Methods</h3>
              <div className="bg-stone-50 p-4 rounded-lg border border-stone-200">
                <p className="text-sm text-stone-600">Currently, we only support <strong>Cash on Delivery (COD)</strong> for all marketplace transactions to ensure security.</p>
              </div>
            </div>
          </div>
        )}

        {/* STEP 5: FINAL REVIEW */}
        {step === 5 && (
          <div className="space-y-6 min-h-[300px]">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-stone-800">Final Review</h2>
              <p className="text-stone-500 mt-2">Check your details before going live</p>
            </div>
            
            <div className="bg-stone-50 p-6 rounded-xl border border-stone-200 space-y-4">
              <div className="flex justify-between items-start border-b pb-4">
                <div>
                  <h3 className="font-bold text-lg text-stone-900">{watch('title')}</h3>
                  <p className="text-amber-600 font-bold text-xl">{formatPKR(watch('price'))}</p>
                </div>
                <div className="text-right">
                  <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-1 rounded uppercase">
                    {watch('condition')}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-y-4 gap-x-8 text-sm">
                <div>
                  <p className="text-stone-400 uppercase text-[10px] font-bold tracking-wider">Quantity</p>
                  <p className="font-semibold text-stone-800">{watch('quantity')} Units</p>
                </div>
                <div>
                  <p className="text-stone-400 uppercase text-[10px] font-bold tracking-wider">Shipping</p>
                  <p className="font-semibold text-stone-800">{formatPKR(watch('shippingCharges'))}</p>
                </div>
                <div>
                  <p className="text-stone-400 uppercase text-[10px] font-bold tracking-wider">Seller</p>
                  <p className="font-semibold text-stone-800">{watch('sellerName')}</p>
                </div>
                <div>
                  <p className="text-stone-400 uppercase text-[10px] font-bold tracking-wider">City</p>
                  <p className="font-semibold text-stone-800">{watch('city')}</p>
                </div>
              </div>
              
              <div className="pt-4 border-t">
                <p className="text-stone-400 uppercase text-[10px] font-bold tracking-wider mb-1">Description</p>
                <p className="text-stone-600 line-clamp-3 text-sm">{watch('description')}</p>
              </div>
            </div>

            <div className="bg-amber-50 p-4 rounded-lg flex items-start gap-3">
              <Info className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800">
                By clicking "Submit your post", your ad will be posted as a standard listing. You can promote it to "Featured" or "Boosted" anytime from your dashboard.
              </p>
            </div>
          </div>
        )}

        {/* NAVIGATION BUTTONS */}
        <div className="flex justify-between items-center mt-8 pt-6 border-t border-stone-100">
          {step > 1 ? (
             <button 
                type="button" 
                onClick={() => { setError(''); setStep(s => s - 1); }}
                className="px-6 py-2.5 text-stone-600 font-medium hover:text-stone-900 hover:bg-stone-100 rounded-md transition-colors flex flex-row items-center gap-1"
             >
               <ChevronLeft className="w-4 h-4" /> Back
             </button>
          ) : <div></div>}

          {step < 5 ? (
             <button 
                type="button" 
                onClick={handleNextStep}
                className="px-8 py-2.5 bg-amber-500 text-stone-900 font-bold rounded-md hover:bg-amber-600 transition-colors flex flex-row items-center gap-1 shadow-sm"
             >
               Next <ChevronRight className="w-4 h-4 font-bold" />
             </button>
          ) : (
             <button 
                type="submit" 
                disabled={submitting}
                className="px-8 py-2.5 bg-green-500 text-white font-bold rounded-md hover:bg-green-600 transition-colors shadow-sm disabled:opacity-70 flex flex-row items-center gap-2"
             >
               {submitting ? 'Submitting...' : 'Submit your post'} <CheckCircle className="w-4 h-4" />
             </button>
          )}
        </div>

      </form>
    </div>
  );
}
