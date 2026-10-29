import { notFound } from "next/navigation";

// Any other path inside a language shows that language's 404 page.
export default function CatchAll() {
  notFound();
}
