import PublicProfile from "./profile";

export default function TeamMemberProfile(routeProps: { params?: { companySlug?: string; username?: string } }) {
  return (
    <PublicProfile
      companySlug={routeProps?.params?.companySlug}
      username={routeProps?.params?.username}
    />
  );
}
