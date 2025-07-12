import dynamic from "next/dynamic";
const LabUploader = dynamic(() => import("../components/LabUploader"), { ssr: false });

export default function HomePage() {
  return <LabUploader />;
}
