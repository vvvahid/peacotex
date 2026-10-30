import type { MetadataRoute } from "next";
import { SITE_LIVE } from "@/lib/site";

/** Search engines: everything except the admin and the API once live; nothing while the site is a demo. */
export default function robots(): MetadataRoute.Robots {
  return SITE_LIVE
    ? { rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api/"] } }
    : { rules: { userAgent: "*", disallow: "/" } };
}
