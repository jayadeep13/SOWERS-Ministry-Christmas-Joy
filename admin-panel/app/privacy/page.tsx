export const metadata = {
  title: 'Privacy Policy – Sowers Ministry',
};

export default function PrivacyPolicy() {
  return (
    <div style={{ fontFamily: 'Georgia, serif', maxWidth: 760, margin: '0 auto', padding: '48px 24px', color: '#1a1a1a', lineHeight: 1.8 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>Privacy Policy</h1>
      <p style={{ color: '#555', marginBottom: 32 }}>Sowers Ministry – Christmas Joy Programme App<br />Last updated: June 23, 2026</p>

      <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 32 }}>1. Introduction</h2>
      <p>Sowers Ministry ("we", "our", or "us") operates the <strong>Sowers Ministry</strong> mobile application (the "App"). This Privacy Policy explains how we collect, use, and protect information when you use our App.</p>

      <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 32 }}>2. Information We Collect</h2>
      <p><strong>Employee account data:</strong> We collect your mobile phone number solely for the purpose of verifying your identity via a one-time password (OTP) and granting access to the App. Only pre-approved employees are permitted to sign in.</p>
      <p><strong>Child registration data:</strong> Authorised employees use the App to record the following details for children enrolled in the Christmas Joy Programme:</p>
      <ul style={{ marginLeft: 20 }}>
        <li>First name and last name</li>
        <li>Parent / guardian name</li>
        <li>Age</li>
        <li>Gender</li>
        <li>Village / locality</li>
      </ul>
      <p>We do not collect any government ID numbers, financial information, precise GPS location, or any other sensitive personal data.</p>

      <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 32 }}>3. How We Use the Information</h2>
      <ul style={{ marginLeft: 20 }}>
        <li>To authenticate employees and prevent unauthorised access.</li>
        <li>To maintain programme records for the Christmas Joy Programme.</li>
        <li>To allow programme administrators to review and manage enrollments.</li>
      </ul>
      <p>We do not use this information for advertising, profiling, or any commercial purpose.</p>

      <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 32 }}>4. Data Storage and Security</h2>
      <p>All data is stored securely on <strong>Google Firebase (Firestore)</strong>, hosted on Google Cloud infrastructure with encryption in transit (TLS) and at rest. Firebase complies with ISO 27001, SOC 1, SOC 2, and SOC 3 standards.</p>
      <p>Access to the data is restricted to authorised ministry administrators only.</p>

      <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 32 }}>5. Data Sharing</h2>
      <p>We do not sell, trade, or share any personal data with third parties. Data is shared only with Google Firebase as the cloud storage provider, under Google's standard data processing terms.</p>

      <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 32 }}>6. Data Retention</h2>
      <p>Registration data is retained for the duration of the programme and deleted at the discretion of programme administrators. Employees may contact us to request deletion of their phone number from our records at any time.</p>

      <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 32 }}>7. Children's Privacy</h2>
      <p>The App is used by adult ministry employees to record enrolment data for children under the supervision of their parents or guardians. We do not allow children to directly use this App or create accounts. Child registration data is collected only with the knowledge and cooperation of the child's parent or guardian at the point of enrolment.</p>

      <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 32 }}>8. Your Rights</h2>
      <p>You may request access to, correction of, or deletion of your personal data at any time by contacting us at the email address below. We will respond within 30 days.</p>

      <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 32 }}>9. Changes to This Policy</h2>
      <p>We may update this Privacy Policy from time to time. Any changes will be posted on this page with a revised date. Continued use of the App after changes constitutes acceptance of the updated policy.</p>

      <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 32 }}>10. Contact Us</h2>
      <p>If you have any questions about this Privacy Policy, please contact us at:</p>
      <p><strong>Sowers Ministry</strong><br />
      Email: <a href="mailto:info@sowersministry.com" style={{ color: '#1a73e8' }}>info@sowersministry.com</a></p>
    </div>
  );
}
