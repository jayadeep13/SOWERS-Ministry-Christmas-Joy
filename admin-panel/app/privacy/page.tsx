export const metadata = {
  title: 'Privacy Policy – Sowers Ministry',
};

export default function PrivacyPolicy() {
  return (
    <div style={{ fontFamily: 'Georgia, serif', maxWidth: 760, margin: '0 auto', padding: '48px 24px', color: '#1a1a1a', lineHeight: 1.8 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>Privacy Policy</h1>
      <p style={{ color: '#555', marginBottom: 32 }}>Sowers Ministry – Christmas Joy Programme App<br />Last updated: July 7, 2026</p>

      <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 32 }}>1. Introduction</h2>
      <p>Sowers Ministry ("we", "our", or "us") operates the <strong>Sowers Ministry</strong> mobile application (the "App") and its companion administrative web dashboard. This Privacy Policy explains how we collect, use, and protect information when you use the App.</p>
      <p>The App is a field-registration tool used exclusively by authorised Sowers Ministry employees to register children for the Christmas Joy Programme. It is not available for public sign-up.</p>

      <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 32 }}>2. Information We Collect</h2>
      <p><strong>Employee account data:</strong> Ministry administrators create an account for each authorised employee, consisting of the employee's name and mobile phone number. Sign-in is done with that phone number and a PIN issued by the administrator. PINs are stored and verified securely through Firebase Authentication and are not otherwise visible to us. For security, an employee's PIN is automatically reset if an incorrect PIN is entered six times within one hour, and the administrator is notified to issue a new one.</p>
      <p><strong>Child registration data:</strong> Authorised employees use the App to record the following details for children enrolled in the Christmas Joy Programme:</p>
      <ul style={{ marginLeft: 20 }}>
        <li>First name and last name</li>
        <li>Parent / guardian name</li>
        <li>Age (up to 14 years)</li>
        <li>Gender</li>
        <li>Village / area</li>
        <li>The date of registration and the employee who registered the child</li>
      </ul>
      <p>We do not collect any government ID numbers, financial information, precise GPS location, photographs, or any other sensitive personal data.</p>
      <p><strong>App preferences:</strong> Your chosen display language (English or Telugu) is saved locally on your device only and is never transmitted to or stored on our servers.</p>

      <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 32 }}>3. How We Use the Information</h2>
      <ul style={{ marginLeft: 20 }}>
        <li>To authenticate employees and prevent unauthorised access, including automatic protection against repeated incorrect sign-in attempts.</li>
        <li>To maintain programme records for the Christmas Joy Programme.</li>
        <li>To allow programme administrators to review, manage, and generate aggregate statistics (such as counts by age group, gender, or village) for enrollments.</li>
      </ul>
      <p>We do not use this information for advertising, profiling, or any commercial purpose.</p>

      <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 32 }}>4. Data Storage and Security</h2>
      <p>Employee sign-in credentials are managed by <strong>Firebase Authentication</strong>, and all programme records are stored on <strong>Google Firebase (Firestore)</strong> — both hosted on Google Cloud infrastructure with encryption in transit (TLS) and at rest. Firebase complies with ISO 27001, SOC 1, SOC 2, and SOC 3 standards. Our administrative web dashboard is hosted on Vercel, which processes requests on our behalf but does not independently retain your personal data outside of Firebase.</p>
      <p>Access to programme records is restricted to authorised ministry administrators. Each employee can only view the registrations they personally submitted.</p>

      <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 32 }}>5. Data Sharing</h2>
      <p>We do not sell, trade, or share any personal data with third parties. Data is processed only by Google Firebase and Vercel as our infrastructure providers, under their standard data processing terms.</p>

      <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 32 }}>6. Data Retention</h2>
      <p>Registration data is retained for the duration of the programme. If an administrator removes a child's record, it is held in a recycle bin — accessible only to administrators — where it can be restored or permanently deleted at their discretion. Employees may contact us at any time to request removal of their account and associated data.</p>

      <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 32 }}>7. Children's Privacy</h2>
      <p>This App is intended solely for use by adult ministry staff. It is not directed at children, and children do not download, install, or directly interact with the App or create accounts within it. Child registration data is entered by ministry staff during in-person enrolment, with the knowledge and cooperation of the child's parent or guardian.</p>

      <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 32 }}>8. App Permissions</h2>
      <p>The App requests only internet access, which is required to communicate securely with our servers. It does not request or access your camera, contacts, location, photos, microphone, or any other device permission.</p>

      <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 32 }}>9. Your Rights</h2>
      <p>You may request access to, correction of, or deletion of your personal data — including your employee account — at any time by contacting us at the email address below. We will respond within 30 days.</p>

      <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 32 }}>10. Changes to This Policy</h2>
      <p>We may update this Privacy Policy from time to time. Any changes will be posted on this page with a revised date. Continued use of the App after changes constitutes acceptance of the updated policy.</p>

      <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 32 }}>11. Contact Us</h2>
      <p>If you have any questions about this Privacy Policy, please contact us at:</p>
      <p><strong>Sowers Ministry</strong><br />
      Email: <a href="mailto:info@sowersministry.com" style={{ color: '#1a73e8' }}>info@sowersministry.com</a></p>
    </div>
  );
}
