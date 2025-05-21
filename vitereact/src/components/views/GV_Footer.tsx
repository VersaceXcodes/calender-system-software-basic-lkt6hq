import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const GV_Footer: React.FC = () => {
  const navigate = useNavigate();

  // Define state variables with default data as provided by the datamap.
  const [footerLinks] = useState([
    { label: "Terms & Conditions", url: "https://example.com/terms" },
    { label: "Privacy Policy", url: "https://example.com/privacy" },
    { label: "Help/Contact", url: "https://example.com/help" }
  ]);
  
  const [companyInfo] = useState({
    companyName: "SimpleCal",
    year: "2023"
  });

  // Action: Handles click events for each footer link.
  const handleFooterLinkClick = (url: string, event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    // If the URL starts with "http", then assume it's external and open in a new tab.
    if (url.startsWith("http")) {
      window.open(url, "_blank", "noopener,noreferrer");
    } else {
      // For internal links use navigate from react-router-dom.
      navigate(url);
    }
  };

  return (
    <>
      <footer className="bg-gray-800 text-gray-300 py-4">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between">
          <div className="flex flex-wrap space-x-4 mb-2 md:mb-0">
            {footerLinks.map((link, index) => (
              <a 
                key={index}
                href={link.url}
                onClick={(e) => handleFooterLinkClick(link.url, e)}
                className="hover:text-white transition-colors duration-200"
              >
                {link.label}
              </a>
            ))}
          </div>
          <div className="text-sm">
            © {companyInfo.year} {companyInfo.companyName}. All rights reserved.
          </div>
        </div>
      </footer>
    </>
  );
};

export default GV_Footer;