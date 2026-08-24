import { LegalLayout } from './LegalLayout';

export const PrivacyPolicy = () => (
  <LegalLayout title="Privacy Policy">
    <div className="space-y-6">
      <div className="text-sm text-gray-500 border-b border-[#EADFC9] pb-3 mb-6">
        Last Updated: August 24, 2026
      </div>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-[#2C1309]">1. Introduction</h2>
        <p>Welcome to Barakah (“Barakah”, “we”, “our”, or “us”).</p>
        <p>
          Barakah is a digital platform and brand owned and operated by <strong>KONNECTHU LLP</strong>, an Indian Limited Liability Partnership.
        </p>
        <p>
          Barakah is a global digital platform designed to support Muslims in their daily lives through Quranic resources, Islamic educational content, AI-powered assistance, prayer tools, community engagement, marketplace services, halal product information, and location-based services.
        </p>
        <p>
          This Privacy Policy explains how KONNECTHU LLP collects, uses, stores, shares, and protects personal information when you access or use the Barakah mobile application, website, and related services (collectively, the “Services”).
        </p>
        <p>
          By using the Services, you acknowledge the practices described in this Privacy Policy. Where required by applicable law, we will obtain your consent before collecting or processing personal information.
        </p>
        <p>
          Depending on the circumstances and applicable law, we process personal information based on consent, contractual necessity, legal obligations, and legitimate interests.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-[#2C1309] border-t border-[#EADFC9] pt-4">2. Information We Collect</h2>
        <p>
          We collect information necessary to provide, maintain, secure, and improve the Services. The information we collect depends on how you use Barakah and the permissions you grant.
        </p>

        <div className="space-y-2">
          <h3 className="font-semibold text-base text-[#2C1309]">2.1 Account Information</h3>
          <p>When you create or use a Barakah account, we may collect:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Full name</li>
            <li>Email address</li>
            <li>Username</li>
            <li>Profile picture</li>
            <li>Account identifiers</li>
            <li>Information provided through Google Sign-In or Sign in with Apple</li>
          </ul>
          <p>
            We use this information to create and manage your account, authenticate you, provide personalized features, and communicate with you regarding the Services.
          </p>
        </div>

        <div className="space-y-2">
          <h3 className="font-semibold text-base text-[#2C1309]">2.2 Location Information</h3>
          <p>With your permission, Barakah may access your device's location to provide location-based features such as:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Prayer times</li>
            <li>Qibla-related services</li>
            <li>Nearby mosques</li>
            <li>Nearby halal restaurants and places</li>
            <li>Other location-based features available within the Services</li>
          </ul>
          <p>Location access is requested when a feature requires it.</p>
          <p>
            If Barakah does not require background location access for a particular feature, location information is only accessed while the relevant feature is being used.
          </p>
          <p>
            You can withdraw or change location permissions at any time through your device settings. Some location-based features may not function correctly if you deny or withdraw location access.
          </p>
        </div>

        <div className="space-y-2">
          <h3 className="font-semibold text-base text-[#2C1309]">2.3 Camera Information</h3>
          <p>
            When you use camera-based features such as Halal Scan, Barakah may request access to your device camera.
          </p>
          <p>
            The camera may be used to scan product barcodes so that Barakah can identify the relevant product and provide halal-related information or other product information available through the Service.
          </p>
          <p>Camera access is only requested when you choose to use a feature that requires the camera.</p>
          <p>Barakah does not use the camera to continuously monitor you.</p>
          <p>
            You can deny or withdraw camera permission through your device settings. If camera access is denied, camera-based features such as Halal Scan may not be available.
          </p>
        </div>

        <div className="space-y-2">
          <h3 className="font-semibold text-base text-[#2C1309]">2.4 Community Content</h3>
          <p>When you use community features such as Guftagu, you may voluntarily submit:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Posts</li>
            <li>Comments</li>
            <li>Images</li>
            <li>Videos</li>
            <li>Other content you choose to publish</li>
          </ul>
          <p>
            Content that you intentionally post publicly may be visible to other Barakah users and may be processed by Barakah for operating and displaying the community features.
          </p>
          <p>
            You should avoid posting personal, confidential, or sensitive information that you do not want other users to see.
          </p>
        </div>

        <div className="space-y-2">
          <h3 className="font-semibold text-base text-[#2C1309]">2.5 Marketplace Information</h3>
          <p>
            When you use Barakah marketplace services, we may collect information necessary to facilitate transactions and operate the marketplace, including:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Billing information</li>
            <li>Shipping information</li>
            <li>Contact information</li>
            <li>Purchase and transaction history</li>
            <li>Order information</li>
            <li>Seller information</li>
            <li>Seller verification information</li>
          </ul>
          <p>Seller verification information may include, where required:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Government-issued identification documents</li>
            <li>Business registration information</li>
            <li>Tax information</li>
            <li>Other documents required for marketplace compliance</li>
          </ul>
          <p>
            We use this information to process orders, facilitate transactions, verify sellers, prevent fraud and abuse, provide customer support, comply with legal obligations, and operate the marketplace.
          </p>
        </div>

        <div className="space-y-2">
          <h3 className="font-semibold text-base text-[#2C1309]">2.6 AI Assistant Information</h3>
          <p>When you use the Barakah AI Assistant, we may collect:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Questions and prompts you submit</li>
            <li>AI conversation history</li>
            <li>Feedback you provide</li>
            <li>Information necessary to provide the requested AI functionality</li>
            <li>Related technical and usage information</li>
          </ul>
          <p>
            AI conversations may be stored to provide conversation continuity, improve service quality, maintain security, investigate misuse, and provide support.
          </p>
          <p>
            Where Barakah uses a third-party AI provider to process your requests, relevant information may be transmitted to that provider to provide the requested AI functionality.
          </p>
          <p>
            Barakah does not use user conversations to train third-party AI models unless this is separately disclosed and permitted by applicable law.
          </p>
        </div>

        <div className="space-y-2">
          <h3 className="font-semibold text-base text-[#2C1309]">2.7 Device and Technical Information</h3>
          <p>We may automatically collect certain technical information when you use the Services, including:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Device type</li>
            <li>Operating system and version</li>
            <li>App version</li>
            <li>Device or installation identifiers</li>
            <li>IP address</li>
            <li>Crash logs</li>
            <li>Diagnostic information</li>
            <li>Error logs</li>
            <li>Performance information</li>
            <li>App interactions and usage information</li>
          </ul>
          <p>
            This information may be collected through Barakah and/or third-party analytics, crash-reporting, and technical service providers.
          </p>
          <p>
            We use this information to operate the Services, diagnose technical problems, improve performance, maintain security, understand usage patterns, and prevent abuse.
          </p>
        </div>

        <div className="space-y-2">
          <h3 className="font-semibold text-base text-[#2C1309]">2.8 Information You Provide to Us</h3>
          <p>You may voluntarily provide additional information when you:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Contact customer support</li>
            <li>Submit feedback</li>
            <li>Report an issue</li>
            <li>Participate in community features</li>
            <li>Participate in marketplace activities</li>
            <li>Communicate with Barakah</li>
            <li>Use other features that require information from you</li>
          </ul>
          <p>
            We use such information for the purpose for which you provide it and for operating, securing, and improving the Services.
          </p>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-[#2C1309] border-t border-[#EADFC9] pt-4">3. How We Use Information</h2>
        <p>We may use collected information to:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Create and manage user accounts</li>
          <li>Authenticate users</li>
          <li>Provide Quranic, Islamic educational, and other platform content</li>
          <li>Provide prayer-related services</li>
          <li>Provide Qibla-related services</li>
          <li>Provide nearby mosque and halal restaurant information</li>
          <li>Provide halal product scanning and information</li>
          <li>Operate community features</li>
          <li>Facilitate marketplace transactions</li>
          <li>Process and manage orders</li>
          <li>Verify marketplace sellers</li>
          <li>Provide AI Assistant functionality</li>
          <li>Maintain conversation continuity where applicable</li>
          <li>Provide customer support</li>
          <li>Improve the Services and user experience</li>
          <li>Analyze app performance and usage</li>
          <li>Detect, investigate, and prevent fraud, abuse, and security incidents</li>
          <li>Maintain the security and integrity of the platform</li>
          <li>Comply with applicable legal and regulatory obligations</li>
          <li>Enforce our terms and policies</li>
          <li>Protect the rights, property, and safety of Barakah, our users, and others</li>
        </ul>
        <p>
          We do not use information for purposes incompatible with the purposes described in this Privacy Policy without obtaining additional consent where required by applicable law.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-[#2C1309] border-t border-[#EADFC9] pt-4">4. Marketplace Transactions</h2>
        <p>Barakah facilitates transactions between buyers and sellers through its marketplace.</p>
        <p>
          When a marketplace transaction occurs, relevant information may be shared with the parties and service providers necessary to fulfill the transaction.
        </p>
        <p>
          For example, a seller may receive information necessary to fulfill and deliver a customer's order, such as the customer's name, contact information, and shipping information.
        </p>
        <p>
          Barakah may also share relevant transaction information with payment processors, delivery or logistics providers, fraud-prevention providers, customer-support providers, and other service providers necessary to complete or support a transaction.
        </p>
        <p>Barakah may charge marketplace commissions from sellers.</p>
        <p>
          Transaction records may be retained for accounting, legal, tax, fraud-prevention, dispute-resolution, and customer-support purposes.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-[#2C1309] border-t border-[#EADFC9] pt-4">5. How We Share Information</h2>
        <p>We do not sell personal information.</p>
        <p>
          We may share information with third parties where necessary to provide, maintain, secure, or improve the Services, including:
        </p>

        <div className="space-y-2">
          <h3 className="font-semibold text-base text-[#2C1309]">Payment and Transaction Providers</h3>
          <p>Payment processors and payment gateways may receive information necessary to process payments and transactions.</p>
        </div>

        <div className="space-y-2">
          <h3 className="font-semibold text-base text-[#2C1309]">Cloud and Infrastructure Providers</h3>
          <p>Cloud hosting, database, storage, authentication, and infrastructure providers may process information on our behalf to operate the Services.</p>
        </div>

        <div className="space-y-2">
          <h3 className="font-semibold text-base text-[#2C1309]">Analytics and Technical Providers</h3>
          <p>
            Analytics, crash-reporting, monitoring, and technical service providers may process technical and usage information to help us understand performance, diagnose problems, and improve the Services.
          </p>
        </div>

        <div className="space-y-2">
          <h3 className="font-semibold text-base text-[#2C1309]">AI Service Providers</h3>
          <p>Where Barakah uses third-party AI services, information necessary to process your AI requests may be transmitted to the relevant provider.</p>
        </div>

        <div className="space-y-2">
          <h3 className="font-semibold text-base text-[#2C1309]">Marketplace Sellers and Service Providers</h3>
          <p>
            Information necessary to fulfill marketplace orders may be shared with sellers, delivery providers, logistics providers, and other relevant service providers.
          </p>
        </div>

        <div className="space-y-2">
          <h3 className="font-semibold text-base text-[#2C1309]">Legal and Regulatory Authorities</h3>
          <p>
            We may disclose information where required by law, regulation, legal process, court order, or governmental request, or where reasonably necessary to protect the rights, safety, security, or property of Barakah, our users, or others.
          </p>
        </div>

        <div className="space-y-2">
          <h3 className="font-semibold text-base text-[#2C1309]">Business Transfers</h3>
          <p>
            If Barakah or substantially all of its assets are involved in a merger, acquisition, restructuring, financing, sale, or similar transaction, personal information may be transferred as part of that transaction, subject to applicable law.
          </p>
        </div>

        <p className="mt-3 text-sm italic text-gray-600">
          Third parties that process personal information on our behalf are expected to provide appropriate protection for that information consistent with this Privacy Policy and applicable legal requirements.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-[#2C1309] border-t border-[#EADFC9] pt-4">6. User Content</h2>
        <p>
          Users retain ownership of content they create and submit to Barakah, subject to the rights necessary for Barakah to operate its Services.
        </p>
        <p>
          By posting content publicly through Guftagu or another community feature, you grant Barakah a worldwide, non-exclusive license to host, store, reproduce, display, distribute, and process that content as reasonably necessary to operate, maintain, and provide the relevant Services.
        </p>
        <p>You are responsible for ensuring that content you submit does not violate applicable law or the rights of others.</p>
        <p>Publicly submitted content may be visible to other users.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-[#2C1309] border-t border-[#EADFC9] pt-4">7. Data Retention</h2>
        <p>
          We retain personal information only for as long as reasonably necessary for the purposes described in this Privacy Policy, including providing the Services, maintaining security, resolving disputes, enforcing agreements, and complying with legal, tax, accounting, or regulatory obligations.
        </p>
        <p className="text-sm font-semibold">Our current general retention periods are:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong>Account information:</strong> retained while your account remains active and, where required, for a reasonable period following deletion for legal, security, fraud-prevention, or dispute-resolution purposes.
          </li>
          <li>
            <strong>Marketplace transaction information:</strong> generally retained for up to 7 years where required for accounting, tax, legal, regulatory, or dispute-resolution purposes.
          </li>
          <li>
            <strong>Technical and application logs:</strong> generally retained for up to 90 days unless a longer period is necessary for security, legal, or investigative purposes.
          </li>
          <li>
            <strong>AI conversations:</strong> generally retained for up to 12 months where stored for conversation continuity, service quality, security, or support purposes.
          </li>
        </ul>
        <p>Retention periods may vary depending on the nature of the information and applicable legal requirements.</p>
        <p>When information is no longer required, we may delete it, anonymize it, or securely dispose of it.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-[#2C1309] border-t border-[#EADFC9] pt-4">8. Data Security</h2>
        <p>
          Barakah implements reasonable technical and organizational measures designed to protect personal information against unauthorized access, disclosure, alteration, loss, or destruction.
        </p>
        <p>
          These measures may include access controls, authentication mechanisms, encryption where appropriate, secure infrastructure, monitoring, and other security practices.
        </p>
        <p>However, no method of transmission or electronic storage is completely secure. Therefore, we cannot guarantee absolute security.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-[#2C1309] border-t border-[#EADFC9] pt-4">9. Your Choices and Permissions</h2>
        <p>You control many of the permissions that Barakah receives from your device.</p>
        <p>Depending on your device and operating system, you may be able to control access to:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Camera</li>
          <li>Location</li>
          <li>Photos and media</li>
          <li>Notifications</li>
          <li>Other device permissions requested by the Services</li>
        </ul>
        <p>You can change these permissions through your device settings.</p>
        <p>
          For example, if you deny camera access, you may continue to use other parts of Barakah, but camera-dependent features such as Halal Scan may not function.
        </p>
        <p>
          Where consent is the legal basis for processing, you may withdraw consent at any time. Withdrawal of consent does not affect the lawfulness of processing that occurred before withdrawal.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-[#2C1309] border-t border-[#EADFC9] pt-4">10. International Data Transfers</h2>
        <p>
          Barakah is intended for users globally and may use service providers located in countries other than the country in which you reside.
        </p>
        <p>
          As a result, personal information may be transferred to, stored in, or processed in countries that may have different data-protection laws from your country of residence.
        </p>
        <p>Where required by applicable law, we will implement appropriate safeguards for international data transfers.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-[#2C1309] border-t border-[#EADFC9] pt-4">11. GDPR and Other Privacy Rights</h2>
        <p>
          Depending on your location and applicable law, you may have rights regarding your personal information, including the right to:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Access your personal information</li>
          <li>Request correction of inaccurate information</li>
          <li>Request deletion of your information</li>
          <li>Request restriction of processing</li>
          <li>Object to certain processing</li>
          <li>Request data portability</li>
          <li>Withdraw consent where processing is based on consent</li>
          <li>Lodge a complaint with a relevant data-protection authority</li>
        </ul>
        <p>
          To exercise applicable rights, contact us at: <a href="mailto:info@barakah.services" className="underline text-[#A35233]">info@barakah.services</a>
        </p>
        <p>We may need to verify your identity before processing certain requests.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-[#2C1309] border-t border-[#EADFC9] pt-4">12. Account Deletion</h2>
        <p>
          You may request deletion of your Barakah account and associated personal information by contacting:{' '}
          <a href="mailto:info@barakah.services" className="underline text-[#A35233]">info@barakah.services</a>
        </p>
        <p>
          Where available, you may also use account-management or deletion functionality provided within the Barakah application.
        </p>
        <p>
          When an account-deletion request is received, we will process it in accordance with applicable law and our legitimate retention requirements.
        </p>
        <p>
          Certain information may need to be retained where required for legal, tax, accounting, fraud-prevention, security, dispute-resolution, or other legitimate purposes.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-[#2C1309] border-t border-[#EADFC9] pt-4">13. Children's Privacy</h2>
        <p>Barakah is intended for users aged 16 years and above.</p>
        <p>We do not knowingly collect personal information from children under 16.</p>
        <p>
          If you believe that a child under 16 has provided personal information to Barakah, please contact us at:{' '}
          <a href="mailto:info@barakah.services" className="underline text-[#A35233]">info@barakah.services</a>
        </p>
        <p>
          If we become aware that we have collected personal information from a child under the applicable minimum age without appropriate authorization, we will take reasonable steps to delete the information where required by law.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-[#2C1309] border-t border-[#EADFC9] pt-4">14. Third-Party Services and Links</h2>
        <p>
          Barakah may use third-party services to provide functionality such as authentication, cloud infrastructure, analytics, payment processing, AI functionality, crash reporting, and other technical services.
        </p>
        <p>
          Third-party services may process information according to their own privacy policies and contractual obligations.
        </p>
        <p>
          Barakah may also contain links to third-party websites or services. We are not responsible for the privacy practices of third-party websites or services that we do not control.
        </p>
        <p>We encourage users to review the privacy policies of third-party services before providing information to them.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-[#2C1309] border-t border-[#EADFC9] pt-4">15. Cookies and Similar Technologies</h2>
        <p>
          The Barakah website and certain online services may use cookies, local storage, pixels, analytics technologies, or similar technologies to maintain functionality, understand usage, improve performance, and support security.
        </p>
        <p>You may be able to control cookies through your browser settings.</p>
        <p>
          The availability and functionality of certain features may be affected if cookies or similar technologies are disabled.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-[#2C1309] border-t border-[#EADFC9] pt-4">16. Changes to This Privacy Policy</h2>
        <p>
          We may update this Privacy Policy from time to time to reflect changes to our Services, technology, legal requirements, or data practices.
        </p>
        <p>
          When we make material changes, we may provide notice through the Barakah application, website, or other appropriate means.
        </p>
        <p>The updated Privacy Policy will become effective when posted unless otherwise stated.</p>
        <p>
          Your continued use of the Services after the effective date of an updated Privacy Policy constitutes acceptance of the updated policy to the extent permitted by applicable law.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-[#2C1309] border-t border-[#EADFC9] pt-4">17. Contact Information</h2>
        <p>Barakah is owned and operated by:</p>
        <div className="bg-[#FFF5E5] p-4 rounded-xl border border-[#E8D5C4] text-sm text-[#2C1309] font-medium leading-relaxed">
          <p className="font-bold text-[#A35233]">KONNECTHU LLP</p>
          <p>Andheri East</p>
          <p>Mumbai – 400069</p>
          <p>Maharashtra, India</p>
          <p className="mt-2">
            Email:{' '}
            <a href="mailto:info@barakah.services" className="underline text-[#A35233]">
              info@barakah.services
            </a>
          </p>
        </div>
        <p className="text-sm text-gray-600">
          For privacy-related questions, data-access requests, correction requests, deletion requests, or other privacy concerns, please contact us at the email address above.
        </p>
      </section>
    </div>
  </LegalLayout>
);

export default PrivacyPolicy;
