export function DevelopmentSecurityBanner() {
  return (
    <div className="dev-banner" role="status">
      Internal development build — authentication is not yet enabled. Real candidate
      schedule information remains prohibited until authentication, role-based access
      control, and the protected calendar database layer are implemented and certified.
    </div>
  );
}
