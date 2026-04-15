import React from "react";
import { useRouter } from "next/router";
import { Select } from "antd";

const { Option } = Select;

const SubNav = () => {
  const router = useRouter();
  const navLinks = [
    { name: "Landscapes", path: "/portfolio/landscapes" },
    { name: "Portraits", path: "/portfolio/portraits" },
    { name: "Bollywood", path: "/portfolio/bollywood" },
  ];

  const handleChange = (value) => {
    router.push(value); // Navigate using Next.js useRouter
  };

  return (
    <div>
      {/* Desktop View */}
      <ul className="hidden md:flex flex-col items-center justify-center h-full space-y-4 md:flex-row md:space-y-0 md:space-x-6 md:h-auto font-medium text-gray-500">
        {navLinks.map((link, index) => (
          <li key={index}>
            <a className={`${router.pathname === link.path ? "text-gray-900 underline" : ""}`} onClick={() => router.push(link.path)}>
              {link.name}
            </a>
          </li>
        ))}
      </ul>

      {/* Mobile View */}
      <Select className="md:hidden w-3/5" defaultValue={router.pathname} onChange={handleChange} size="large">
        {navLinks.map((link, index) => (
          <Option key={index} value={link.path}>
            {link.name}
          </Option>
        ))}
      </Select>
    </div>
  );
};

export default SubNav;
