export default function Page() {
  return (
    <main className="prose mx-auto p-6">
      <h1>Privacy Policy</h1>
      <p>Last updated: {new Date().toISOString().slice(0, 10)}</p>
      <p>
        DealFlow connects to your email account to help draft replies and manage
        follow-ups.
      </p>
      <h2>Data We Process</h2>
      <ul>
        <li>Basic profile (name, email) for sign-in.</li>
        <li>
          Email metadata and message content needed to generate replies,
          follow-ups, and search.
        </li>
      </ul>
      <h2>How We Use Data</h2>
      <ul>
        <li>
          Provide core features (smart replies, reminders, tone/grammar help).
        </li>
        <li>
          Improve quality and reliability (logs/analytics without selling data).
        </li>
      </ul>
      <h2>Sharing</h2>
      <p>
        We do not sell personal data. We use trusted processors (e.g., hosting,
        email APIs like Aurinko) bound by DPAs.
      </p>
      <h2>Security</h2>
      <p>
        Encryption in transit (TLS) and at rest for stored data; least-privilege
        access; audit logging.
      </p>
      <h2>Your Choices</h2>
      <p>
        Disconnect accounts anytime and request deletion at{" "}
        <a href="mailto:narakithya0@gmail.com">narakithya@gmail.com</a>.
      </p>
      <h2>Contact</h2>
      <p>
        Questions:{" "}
        <a href="mailto:narakithya0@gmail.com">narakithya@gmail.com</a>
      </p>
    </main>
  );
}
