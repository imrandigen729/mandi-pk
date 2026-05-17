export function Disclaimer() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-stone-900 mb-8">Platform Disclaimer</h1>
      
      <div className="bg-white p-8 rounded-lg shadow-sm border border-stone-200 prose prose-stone max-w-none">
        <p><strong>Please read this disclaimer carefully before using Mandi.pk.</strong></p>
        
        <ul>
          <li><strong>Platform Role:</strong> Mandi.pk acts merely as an online classifieds platform connecting buyers and sellers. We are not a party to any transactions.</li>
          <li><strong>No Guarantee of Authenticity:</strong> We do not verify, guarantee, or endorse the authenticity, condition, legality, or value of any items or services listed on this site.</li>
          <li><strong>User Responsibility:</strong> Users are solely responsible for ensuring that their listings and transactions comply with all applicable local laws and regulations regarding the sale of items and services.</li>
          <li><strong>Fraud & Scams:</strong> Mandi.pk assumes no liability for online fraud, misrepresented items, unmet expectations, or financial loss. Buyers should exercise extreme caution, verify items in person if possible, and use secure payment methods.</li>
          <li><strong>Listing Removal:</strong> We reserve the right to modify, reject, or remove any listing that violates our rules or policies without prior notice. <strong>No refund will be issued for paid plans if a listing is removed due to violations.</strong></li>
        </ul>

        <p className="mt-8 text-sm text-stone-500">
          By using this website, you acknowledge and agree to these terms. Proceed at your own risk.
        </p>
      </div>
    </div>
  );
}
