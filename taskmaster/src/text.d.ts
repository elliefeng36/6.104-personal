// Allows TypeScript to import Markdown specifications as text.
declare module "*.md" {
  const text: string;
  export default text;
}
