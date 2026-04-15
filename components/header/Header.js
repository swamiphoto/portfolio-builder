import React, { useState } from "react";
import Link from "next/link"; // Next.js client-side routing
import { useRouter } from "next/router"; // Next.js routing hook
import { RxHamburgerMenu } from "react-icons/rx";
import { TfiClose } from "react-icons/tfi";
import "./Header.module.css"; // Adjust for your styles if necessary

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const router = useRouter(); // Use useRouter instead of useLocation

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  // Conditionally apply styles based on the current route
  const linkStyle = (path) => (router.pathname === path ? "text-gray-900 underline" : "");

  return (
    <header className="w-full header">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8 w-full">
        <Link href="/" className="block mt-10">
          <img src="/logo1.png" alt="Logo" className="h-16" />
        </Link>
        <div className="flex items-center">
          <nav aria-label="Global" className={`${isMenuOpen ? "block" : "hidden"} nav fixed inset-0 bg-gray-100 z-30 md:relative md:block md:bg-transparent`}>
            <TfiClose onClick={toggleMenu} className={`h-5 w-5 absolute top-5 right-5 transition-opacity md:hidden ${isMenuOpen ? "opacity-100" : "opacity-0"}`} />
            <ul className="flex flex-col items-center justify-center h-full space-y-4 md:flex-row md:space-y-0 md:space-x-6 md:h-auto font-medium text-gray-500">
              <li>
                <Link href="/portfolio" className={linkStyle("/portfolio")} onClick={closeMenu}>
                  Portfolio
                </Link>
              </li>
              <li>
                <Link href="/galleries" className={linkStyle("/galleries")} onClick={closeMenu}>
                  Galleries
                </Link>
              </li>
              {/* <li>
                <Link href="/course-platform" className={linkStyle("/course-platform")} onClick={closeMenu}>
                  12-Week Program
                </Link>
              </li> */}
              {/* <li>
                <Link href="/wallprints" className={linkStyle("/wallprints")} onClick={closeMenu}>
                  Wall Prints
                </Link>
              </li> */}
              <li>
                <a href="https://swamiphoto.substack.com" target="_blank" rel="noreferrer" className={linkStyle("/podcast")} onClick={closeMenu}>
                  Podcast
                </a>
              </li>
              <li>
                <Link href="/about" className={linkStyle("/about")} onClick={closeMenu}>
                  About
                </Link>
              </li>
            </ul>
          </nav>
          <button onClick={toggleMenu} className={`block rounded p-2.5 text-gray-600 transition md:hidden ${isMenuOpen ? "open" : ""}`}>
            <span className="sr-only">Toggle menu</span>
            <RxHamburgerMenu className={`h-5 w-5 transition-transform ${isMenuOpen ? "hidden" : ""}`} />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
