import React from "react";

const Footer = () => {
  return (
    <footer className="mx-auto p-8 md:p-24 pt-0 mt-10 text-gray-700">
      <div className="text-sm md:text-base">All images copyright © 2025 Swami Venkataramani</div>
      <div className="text-sm mt-1">
        Website{" "}
        <b>
          <a href="https://svenkastudio.com" target="_blank" className="underline hover:text-red-500 font-normal">
            designed and built
          </a>
        </b>{" "}
        by me.{" "}
      </div>
    </footer>
  );
};

export default Footer;
