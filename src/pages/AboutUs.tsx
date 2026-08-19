import { Layout } from '@/components/Layout';

const CREAM = '#FFF5E5';
const CARD = '#FFF8F3';
const BORDER = '#E8D5C4';
const BROWN = '#A35233';
const BROWN_DARK = '#3A1E12';
const MUTED = '#7C6A4F';

export const AboutUs = () => (
  <Layout pageBackgroundColor={CREAM} showHeader showNavigation headerTitle="About Us">
    <div className="min-h-screen px-4 py-6" style={{ backgroundColor: CREAM }}>
      <div className="space-y-5">
        <section className="rounded-2xl border p-5 shadow-sm" style={{ backgroundColor: CARD, borderColor: BORDER }}>
          <h2 className="text-xl font-bold mb-3" style={{ color: BROWN_DARK }}>Our Mission</h2>
          <p className="text-[15px] leading-relaxed" style={{ color: MUTED }}>
            To create a unified digital space where Muslims can connect with their faith, community, and daily practices.
          </p>
        </section>

        <section className="rounded-2xl border p-5 shadow-sm" style={{ backgroundColor: CARD, borderColor: BORDER }}>
          <h2 className="text-xl font-bold mb-3" style={{ color: BROWN_DARK }}>Our Vision</h2>
          <p className="text-[15px] leading-relaxed" style={{ color: MUTED }}>
            A world where every Muslim has access to comprehensive tools for spiritual development and community engagement.
          </p>
        </section>

        <section className="rounded-2xl border p-5 shadow-sm" style={{ backgroundColor: CARD, borderColor: BORDER }}>
          <h2 className="text-xl font-bold mb-3" style={{ color: BROWN_DARK }}>Our Core Values</h2>
          <p className="mb-4 text-[15px] leading-relaxed" style={{ color: MUTED }}>
            Built on principles that guide every decision we make.
          </p>

          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-1" style={{ color: BROWN_DARK }}>1. Community First</h3>
              <p className="text-[15px] leading-relaxed" style={{ color: MUTED }}>Building a strong, supportive global Muslim community.</p>
            </div>

            <div>
              <h3 className="font-semibold mb-1" style={{ color: BROWN_DARK }}>2. Transparency</h3>
              <p className="text-[15px] leading-relaxed" style={{ color: MUTED }}>Open and honest communication with our users and partners.</p>
            </div>

            <div>
              <h3 className="font-semibold mb-1" style={{ color: BROWN_DARK }}>3. Innovation</h3>
              <p className="text-[15px] leading-relaxed" style={{ color: MUTED }}>Continuous improvement to serve the Ummah better.</p>
            </div>

            <div>
              <h3 className="font-semibold mb-1" style={{ color: BROWN_DARK }}>4. Privacy &amp; Security</h3>
              <p className="text-[15px] leading-relaxed" style={{ color: MUTED }}>Protecting your data with enterprise-grade encryption.</p>
            </div>

            <div>
              <h3 className="font-semibold mb-1" style={{ color: BROWN_DARK }}>5. Excellence</h3>
              <p className="text-[15px] leading-relaxed" style={{ color: MUTED }}>Delivering the highest quality experience in everything we do.</p>
            </div>

            <div>
              <h3 className="font-semibold mb-1" style={{ color: BROWN_DARK }}>6. Global Impact</h3>
              <p className="text-[15px] leading-relaxed" style={{ color: MUTED }}>Creating positive change across Muslim communities worldwide.</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  </Layout>
);

export default AboutUs;
