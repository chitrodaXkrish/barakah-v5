import { LegalLayout } from './LegalLayout';

export const SellerPolicy = () => (
  <LegalLayout title="Seller Terms & Conditions">
    <div className="space-y-6">
      <p className="font-medium text-[16px] text-[#A35233] leading-relaxed">
        By registering as a seller on Barakah, you agree to follow this Seller Policy and all applicable laws. This policy applies to all sellers, products, orders and transactions made through the Barakah Marketplace.
      </p>

      <section className="space-y-3">
        <h2 className="text-lg font-bold border-b border-[#EADFC9] pb-1 mt-6 text-[#2C1309]">1. Seller Eligibility & Verification</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>Sellers must provide accurate identity, business and payment information.</li>
          <li>Barakah may require KYC, business, bank, tax, product or certification documents.</li>
          <li>Sellers must keep their information up to date.</li>
          <li>Bank accounts used for payouts must belong to or be authorised for the seller/business.</li>
          <li>Barakah may re-verify seller information at any time.</li>
          <li>Sellers may not create duplicate accounts to bypass restrictions or suspension.</li>
          <li>Sellers cannot sell, publish products, accept orders or receive payouts until required verification is completed.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold border-b border-[#EADFC9] pb-1 mt-6 text-[#2C1309]">2. Seller Responsibilities</h2>
        <p className="text-sm font-semibold">Sellers are responsible for:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>The legality, safety and authenticity of their products.</li>
          <li>Accurate product descriptions, prices, images and stock information.</li>
          <li>Required licences, permits and certifications (optional).</li>
          <li>Proper packaging and fulfilment.</li>
          <li>Shipping and delivery arrangements.</li>
          <li>Providing valid tracking information where applicable.</li>
          <li>Meeting the delivery timeframe stated in the listing.</li>
          <li>Responding to Barakah and customer requests.</li>
          <li>Applicable taxes, duties and regulatory obligations, except where Barakah is legally required to collect, report or remit them.</li>
        </ul>
        <p className="mt-3 text-sm italic text-gray-600">
          Barakah operates the marketplace platform and is not the manufacturer of products sold by independent sellers.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold border-b border-[#EADFC9] pb-1 mt-6 text-[#2C1309]">3. Product Listings</h2>
        <p className="text-sm font-semibold">Every listing must accurately include, where applicable:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Product name and description</li>
          <li>Category</li>
          <li>Price and currency</li>
          <li>Clear product images</li>
          <li>Available variants/sizes</li>
          <li>Dimensions or specifications</li>
          <li>Stock availability</li>
          <li>Shipping information</li>
          <li>Estimated delivery time</li>
          <li>Return eligibility</li>
          <li>Halal status or certification information where relevant</li>
        </ul>
        <p className="mt-3">
          Listings must not contain misleading claims, fake discounts, fake scarcity, false reviews, unsupported guarantees or imagery that materially misrepresents the product.
        </p>
        <p>
          Barakah may reject, edit, restrict or remove listings that violate this policy.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold border-b border-[#EADFC9] pb-1 mt-6 text-[#2C1309]">4. Prohibited Products</h2>
        <p className="text-sm font-semibold">The following products are prohibited unless expressly approved and legally permitted:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Alcohol and alcoholic products</li>
          <li>Pork and pork-derived products</li>
          <li>Haram or prohibited food/products</li>
          <li>Counterfeit or stolen goods</li>
          <li>Illegal or restricted products</li>
          <li>Weapons and prohibited weapons</li>
          <li>Drugs and controlled substances</li>
          <li>Tobacco and nicotine products</li>
          <li>Sexually explicit/adult products</li>
          <li>Gambling-related products or services</li>
          <li>Products that infringe intellectual-property rights</li>
          <li>Fraudulent financial products</li>
          <li>Products making unlawful or misleading medical/health claims</li>
          <li>Products prohibited under applicable law</li>
          <li>Any product Barakah reasonably determines is unsuitable for the marketplace</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold border-b border-[#EADFC9] pb-1 mt-6 text-[#2C1309]">5. Prohibited Seller Conduct</h2>
        <p className="text-sm font-semibold">Sellers must not:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Create fake orders or reviews.</li>
          <li>Manipulate ratings, rankings or sales.</li>
          <li>Purchase their own products to manipulate activity.</li>
          <li>Use misleading pricing or discounts.</li>
          <li>Provide false stock or tracking information.</li>
          <li>Circumvent Barakah's commission or payment system.</li>
          <li>Request or accept off-platform payments for Barakah orders.</li>
          <li>Move Barakah customers to external transactions.</li>
          <li>Manipulate cancellations, refunds or delivery status.</li>
          <li>Use another person's images, content or intellectual property without permission.</li>
          <li>Create multiple accounts to evade restrictions.</li>
          <li>Misuse customer information.</li>
          <li>Contact Barakah customers for unrelated marketing without appropriate consent.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold border-b border-[#EADFC9] pb-1 mt-6 text-[#2C1309]">6. Halal Claims</h2>
        <p className="text-sm font-semibold">Where a seller makes a halal claim, the seller is responsible for ensuring that the claim is accurate.</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Sellers must not claim that a product is “Halal Certified" unless appropriate certification exists.</li>
          <li>Barakah may request halal certification or supporting documentation.</li>
          <li>Sellers must not use "Barakah Certified", "Barakah Verified Halal" or similar wording unless officially granted by Barakah.</li>
          <li>An automated ingredient check or marketplace status does not itself constitute halal certification.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold border-b border-[#EADFC9] pb-1 mt-6 text-[#2C1309]">7. Orders & Fulfilment</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>Sellers are responsible for fulfilling accepted orders within the stated timeframe.</li>
          <li>Sellers control their own shipping method and courier unless otherwise specified by Barakah.</li>
          <li>Sellers must maintain accurate stock.</li>
          <li>Sellers may cancel an accepted order only within the permitted cancellation period or where otherwise allowed by Barakah.</li>
          <li>Sellers must promptly inform Barakah of significant fulfilment or delivery problems.</li>
          <li>If a seller account is suspended, Barakah may cancel affected orders and arrange for products to be returned to the seller where applicable.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold border-b border-[#EADFC9] pb-1 mt-6 text-[#2C1309]">8. Commission & Fees</h2>
        <p>Barakah currently charges a 12% marketplace commission on the applicable transaction value.</p>
        <div className="bg-[#FFF5E5] p-4 rounded-xl border border-[#E8D5C4] space-y-1 text-sm font-medium">
          <p className="text-[#A35233] font-bold">Example Calculation:</p>
          <div className="grid grid-cols-2 gap-2 text-[#2C1309]/80 pt-1">
            <span>Product price:</span>
            <span className="font-bold">£100</span>
            <span>Barakah commission (12%):</span>
            <span className="font-bold">-£12</span>
            <span className="border-t border-[#E8D5C4] pt-1">Seller proceeds:</span>
            <span className="border-t border-[#E8D5C4] pt-1 font-bold text-[#A35233]">£88</span>
          </div>
          <p className="text-xs text-gray-500 pt-2">** Before other applicable transaction-related deductions.</p>
        </div>
        <p>The commission is deducted before seller payout.</p>
        <p>Any applicable payment-processing, refund, chargeback, tax, shipping or other transaction-related deductions may also be deducted where applicable.</p>
        <p>Barakah may introduce additional marketplace fees in the future with appropriate notice.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold border-b border-[#EADFC9] pb-1 mt-6 text-[#2C1309]">9. Seller Payouts</h2>
        <p>
          Seller payouts are generally processed <strong>15 days after confirmed delivery (T+15)</strong>, subject to applicable verification, refund and dispute periods.
        </p>
        <p className="text-sm font-semibold">Barakah may delay, hold or offset payouts where:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>An order is disputed.</li>
          <li>A refund or chargeback is pending.</li>
          <li>Fraud or policy violations are suspected.</li>
          <li>Additional KYC or seller verification is required.</li>
          <li>Bank details have changed.</li>
          <li>The seller account is restricted or suspended.</li>
          <li>The seller owes amounts to Barakah.</li>
        </ul>
        <p>Payout timing may also be affected by payment providers, banks or circumstances outside Barakah's control.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold border-b border-[#EADFC9] pb-1 mt-6 text-[#2C1309]">10. Returns, Refunds & Chargebacks</h2>
        <p>Returns and refunds are handled according to the applicable Barakah customer policy and applicable law.</p>
        <p className="text-sm font-semibold">Sellers may be responsible for returns, refunds or related costs where:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>The wrong product was sent.</li>
          <li>The product does not match the listing.</li>
          <li>The product is defective or damaged due to seller/packaging issues.</li>
          <li>The order was not properly fulfilled.</li>
          <li>The seller otherwise caused the issue.</li>
        </ul>
        <p>
          Customer change-of-mind returns, defective products, personalised products, perishable goods and hygiene-sensitive products may have different rules depending on applicable law and the Barakah return policy.
        </p>
        <p>Certain products may be excluded from return where legally permitted.</p>
        <p>Barakah may recover refunds, chargebacks and related amounts from future seller payouts where permitted.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold border-b border-[#EADFC9] pb-1 mt-6 text-[#2C1309]">11. Customer Information & Privacy</h2>
        <p className="text-sm font-semibold">Customer information received through Barakah may only be used to:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Fulfil the relevant order.</li>
          <li>Provide necessary customer service.</li>
          <li>Meet legal or operational requirements.</li>
        </ul>
        <p>Sellers must not sell, share, scrape, export or use customer information for unrelated marketing or other unauthorised purposes.</p>
        <p>Sellers must comply with applicable privacy and data-protection laws.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold border-b border-[#EADFC9] pb-1 mt-6 text-[#2C1309]">12. Reviews & Ratings</h2>
        <p className="text-sm font-semibold">Sellers must not:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Create or purchase fake reviews.</li>
          <li>Pay or reward customers for positive reviews where prohibited.</li>
          <li>Threaten customers because of negative reviews.</li>
          <li>Manipulate ratings or review systems.</li>
        </ul>
        <p>Barakah may remove reviews or take action against sellers where review manipulation is identified.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold border-b border-[#EADFC9] pb-1 mt-6 text-[#2C1309]">13. Intellectual Property</h2>
        <p>Sellers must have the necessary rights to use all product images, videos, descriptions, logos, trademarks and other content uploaded to Barakah.</p>
        <p>By uploading content, the seller grants Barakah a limited, non-exclusive right to use that content for operating, displaying and promoting the marketplace.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold border-b border-[#EADFC9] pb-1 mt-6 text-[#2C1309]">14. Compliance & Audits</h2>
        <p>Barakah may request reasonable documentation, product information, samples, certifications or other evidence to verify:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Seller identity</li>
          <li>Product authenticity</li>
          <li>Product safety</li>
          <li>Halal claims</li>
          <li>Legal compliance</li>
          <li>Listing accuracy</li>
          <li>Compliance with this policy</li>
        </ul>
        <p>Failure to provide requested information may result in listing removal, payout restrictions or account suspension.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold border-b border-[#EADFC9] pb-1 mt-6 text-[#2C1309]">15. Suspension & Termination</h2>
        <p>Barakah may restrict, suspend or terminate a seller account for reasons including:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Fraud or suspected fraud</li>
          <li>False KYC or seller information</li>
          <li>Prohibited products</li>
          <li>Counterfeit products</li>
          <li>Repeated policy violations</li>
          <li>Repeated fulfilment failures or cancellations</li>
          <li>Customer abuse or misconduct</li>
          <li>Review manipulation</li>
          <li>Off-platform transactions</li>
          <li>Misuse of customer information</li>
          <li>Legal or regulatory concerns</li>
        </ul>
        <p className="text-sm font-semibold">Depending on the circumstances, Barakah may:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Remove listings.</li>
          <li>Restrict selling activity.</li>
          <li>Hold payouts.</li>
          <li>Cancel affected orders.</li>
          <li>Recover refunds or losses where permitted.</li>
          <li>Suspend the account.</li>
          <li>Permanently terminate the account.</li>
          <li>Take legal action where appropriate.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold border-b border-[#EADFC9] pb-1 mt-6 text-[#2C1309]">16. Seller Liability</h2>
        <p>Sellers remain responsible for claims, losses, penalties and expenses arising from their:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Products</li>
          <li>Product defects or safety issues</li>
          <li>False or misleading claims</li>
          <li>Intellectual-property infringement</li>
          <li>Legal or regulatory violations</li>
          <li>Negligence</li>
          <li>Breach of this policy</li>
        </ul>
        <p>Where legally permitted, sellers may be required to reimburse Barakah for losses arising from these matters.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold border-b border-[#EADFC9] pb-1 mt-6 text-[#2C1309]">17. Changes to This Policy</h2>
        <p>Barakah may update this Seller Policy from time to time to reflect changes to the marketplace, applicable law, payment systems or business practices.</p>
        <p>Material changes will be communicated through appropriate channels. Continued use of the marketplace after the effective date of an updated policy constitutes acceptance of the updated terms.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold border-b border-[#EADFC9] pb-1 mt-6 text-[#2C1309]">18. Governing Law</h2>
        <p>These Seller Terms are subject to the applicable laws and jurisdiction specified in Barakah's main Terms of Service.</p>
        <p>Where a conflict exists between this Seller Policy and mandatory applicable law, the mandatory legal requirement will prevail.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold border-b border-[#EADFC9] pb-1 mt-6 text-[#2C1309]">19. Refund Policy</h2>
        <p className="font-semibold text-red-600 bg-red-50 p-3 rounded-lg border border-red-100">
          Tax amount and 12% commission will not be refunded in case of issues from the seller end with product.
        </p>
      </section>
    </div>
  </LegalLayout>
);

export default SellerPolicy;
