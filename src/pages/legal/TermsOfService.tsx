import { LegalLayout } from './LegalLayout';

export const TermsOfService = () => (
  <LegalLayout title="Terms of Service">
    <section>
      <h2 className="text-xl font-semibold mb-2">1. Acceptance of Terms</h2>
      <p>By accessing or using Barakah, you agree to be bound by these Terms of Service. If you do not agree, you may not use the Service.</p>
      <p>Users acknowledge that use of the Service and reliance on any content, recommendations, calculations, community posts, marketplace listings, or AI-generated responses is at their own discretion and risk.</p>
      <p>Certain features may rely on third-party services, websites, applications, or providers. Barakah is not responsible for the availability, accuracy, security, or practices of third-party services.</p>
    </section>

    <section>
      <h2 className="text-xl font-semibold mb-2">2. Eligibility</h2>
      <p>Users must be at least 16 years old to access Barakah.</p>
    </section>

    <section>
      <h2 className="text-xl font-semibold mb-2">3. User Accounts</h2>
      <p>Users are responsible for maintaining account security, keeping login credentials confidential, and ensuring information is accurate.</p>
      <p>Barakah may suspend or terminate accounts for violations of these Terms.</p>
      <p>Users may request deletion of their accounts in accordance with the Privacy Policy.</p>
    </section>

    <section>
      <h2 className="text-xl font-semibold mb-2">4. Islamic Content Disclaimer</h2>
      <p>Barakah provides access to Quran, Hadith, Duas, prayer times, Qibla direction, and educational content for informational and educational purposes only.</p>
      <p>Users remain responsible for verifying religious decisions with qualified scholars where appropriate.</p>
    </section>

    <section>
      <h2 className="text-xl font-semibold mb-2">5. AI Assistant Disclaimer</h2>
      <p>The Barakah AI Assistant provides automated responses based on available Islamic resources and technology. AI-generated content may be incomplete, may contain inaccuracies, does not constitute religious rulings (fatwas), and does not replace qualified Islamic scholars.</p>
      <p>Users should seek appropriate professional, legal, medical, financial, or religious advice when required.</p>
      <p>Information provided through Barakah does not constitute legal, medical, financial, investment, tax, or religious advice and should not be relied upon as a substitute for consultation with qualified professionals.</p>
    </section>

    <section>
      <h2 className="text-xl font-semibold mb-2">6. Marketplace</h2>
      <p>Barakah operates a marketplace connecting buyers and verified sellers. Barakah may process payments, facilitate transactions, and collect commissions.</p>
      <p>Barakah is not responsible for product defects, seller representations, shipping delays, or third-party conduct.</p>
      <h3 className="font-semibold mt-3">Refunds and Disputes</h3>
      <p>Refunds, returns, exchanges, and warranty claims are generally the responsibility of the seller unless otherwise stated. Barakah may assist in dispute resolution but is not obligated to provide refunds for transactions conducted between buyers and sellers.</p>
      <p>Barakah reserves the right to investigate disputes and take appropriate action against users or sellers who violate marketplace policies.</p>
      <p>Barakah may charge sellers platform fees, commissions, payment processing fees, or other service charges as communicated through the platform.</p>
    </section>

    <section>
      <h2 className="text-xl font-semibold mb-2">7. Seller Obligations</h2>
      <p>Sellers must provide accurate product information, comply with applicable laws, fulfill orders promptly, and sell only lawful products.</p>
      <p>Prohibited products include: alcohol, pork products, tobacco, drugs, weapons, adult content, counterfeit goods, and illegal products.</p>
      <p>Barakah reserves the right to request identification documents, business records, or other verification materials from sellers and may suspend or remove sellers who fail verification requirements.</p>
    </section>

    <section>
      <h2 className="text-xl font-semibold mb-2">8. Guftagu Community Rules</h2>
      <p>Users may not post: hate speech, harassment, extremist content, terrorist propaganda, violence, pornographic material, spam, fraudulent content, or copyright-infringing material.</p>
      <p>Barakah reserves the right to remove content without notice.</p>
    </section>

    <section>
      <h2 className="text-xl font-semibold mb-2">9. User Generated Content</h2>
      <p>Users retain ownership of content they submit. By uploading content, users grant Barakah a worldwide, royalty-free license to display and distribute such content for platform operations.</p>
    </section>

    <section>
      <h2 className="text-xl font-semibold mb-2">10. Halal Scan Disclaimer</h2>
      <p>Halal Scan provides informational guidance based on available product information. Barakah does not guarantee the religious status, ingredients, manufacturing practices, or certification of any product. Users should independently verify product information where necessary.</p>
    </section>

    <section>
      <h2 className="text-xl font-semibold mb-2">11. Prayer Times and Qibla Disclaimer</h2>
      <p>Prayer times, sunrise data, and Qibla direction are calculated using available technologies and data sources. Users should independently verify information before relying upon it for religious obligations.</p>
    </section>

    <section>
      <h2 className="text-xl font-semibold mb-2">12. Intellectual Property</h2>
      <p>All Barakah branding, software, content, designs, trademarks, and proprietary materials remain the property of KONNECTHU LLP or its licensors.</p>
    </section>

    <section>
      <h2 className="text-xl font-semibold mb-2">13. Termination</h2>
      <p>Barakah may suspend or terminate access at any time for policy violations, fraud, abuse, or security risks.</p>
    </section>

    <section>
      <h2 className="text-xl font-semibold mb-2">14. Limitation of Liability</h2>
      <p>To the maximum extent permitted by law, Barakah shall not be liable for indirect, incidental, consequential, special, or punitive damages arising from use of the Service.</p>
    </section>

    <section>
      <h2 className="text-xl font-semibold mb-2">15. Governing Law</h2>
      <p>These Terms of Service shall be governed by and construed in accordance with the laws of India, without regard to its conflict of law provisions.</p>
    </section>

    <section>
      <h2 className="text-xl font-semibold mb-2">16. Contact</h2>
      <p>Barakah is a brand owned and operated by KONNECTHU LLP.</p>
      <p className="whitespace-pre-line">
        KONNECTHU LLP{"\n"}
        Shop No. 12, Zarina Bano, Khan Chawl,{"\n"}
        Mogra Pada, Andheri East,{"\n"}
        Mumbai - 400069, Maharashtra, India{"\n"}
        Email: <a href="mailto:info@barakah.services" className="underline">info@barakah.services</a>
      </p>
    </section>
  </LegalLayout>
);

export default TermsOfService;
