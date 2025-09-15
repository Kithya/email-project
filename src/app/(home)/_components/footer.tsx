import React from "react";
import logo from "../../../../public/logo.png";
import Image from "next/image";
import { footerSections } from "~/lib/data";

const Footer = () => {
  return (
    <footer className="bg-muted/20 border-border border-t">
      <div className="container mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-3 lg:grid-cols-6">
          <div className="col-span-2 md:col-span-3 lg:col-span-2">
            <div className="mb-4 flex items-center space-x-2">
              <Image src={logo} alt="logo" />
            </div>
            <p className="text-muted-foreground mb-4 leading-relaxed">
              AI-powered email management for modern professionals. Streamline
              your workflow with intelligent automation.
            </p>
            <div className="text-muted-foreground text-sm">
              <p>5123 Market St. #22B</p>
              <p>San Francisco, California</p>
              <p>94103</p>
            </div>
          </div>

          {footerSections.map((section, index) => (
            <div className="col-span-1" key={index}>
              <h3 className="text-foreground mb-4 font-semibold mt-4">
                {section.title}
              </h3>
              <ul className="col-span-3">
                {section.links.map((link, linkIndex) => (
                  <li key={linkIndex}>
                    <a
                      href={link.href}
                      className="text-muted-foreground hover:text-primary duration200 transition-colors"
                    >
                      {link.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-border mt-12 border-t pt-8">
          <div className="flex flex-col items-center justify-between md:flex-row">
            <p className="text-muted-foreground text-sm">
              © 2024 Dealflow. All rights reserved.
            </p>
            <div className="mt-4 flex space-x-6 md:mt-0">
              <a
                href="#"
                className="text-muted-foreground hover:text-primary transition-colors duration-200"
              >
                Privacy Policy
              </a>
              <a
                href="#"
                className="text-muted-foreground hover:text-primary transition-colors duration-200"
              >
                Terms of Service
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
