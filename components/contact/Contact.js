import React, { useRef } from "react";
import "./Contact.module.css";
import SectionHeader from "../section-header/SectionHeader";
import CustomButton from "../custom-button/CustomButton";
import { notification, Button } from "antd";
import { SmileOutlined, FrownOutlined } from "@ant-design/icons";

const Contact = () => {
  const formRef = useRef(null); // Create a ref for the form

  const openNotification = (type, message, description) => {
    notification[type]({
      message,
      description,
      icon: type === "success" ? <SmileOutlined style={{ color: "#108ee9" }} /> : <FrownOutlined style={{ color: "#ff4d4f" }} />,
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const formData = {
      name: event.target.name.value,
      email: event.target.email.value,
      message: event.target.message.value,
    };

    try {
      const response = await fetch("https://swamiphoto-github-io.vercel.app/api/send-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        console.log("Email sent successfully");
        openNotification("success", "Email sent!", "Thanks for reaching out. I'll reply ASAP.");
      } else {
        console.log("Error sending email");
        openNotification("error", "Error", "Sorry, there was an issue sending your message. Please reach me at (602) 561-7190.");
      }
    } catch (error) {
      console.error("Error sending email:", error);
      openNotification("error", "Error", "Sorry, there was an issue sending your message. Please reach me at (602) 561-7190.");
    } finally {
      formRef.current.reset();
    }
  };

  return (
    <div className="mx-auto max-w-screen-xl px-4 py-16 sm:px-6 lg:px-8">
      <SectionHeader title="Get in touch" description="Let me know what you need, and I'll get back to you ASAP." />
      <form ref={formRef} onSubmit={handleSubmit} action="" className="mx-auto mb-0 mt-8 max-w-lg space-y-4">
        <div>
          <label htmlFor="name" className="sr-only">
            Name
          </label>
          <input type="text" id="name" placeholder="Name" className="input" />
        </div>

        <div>
          <label htmlFor="email" className="sr-only">
            Email
          </label>
          <input type="email" id="email" placeholder="Email" className="input" />
        </div>

        <div>
          <label htmlFor="phone" className="sr-only">
            Phone Number
          </label>
          <input type="tel" id="phone" placeholder="Phone Number" className="input" />
        </div>

        <div>
          <label htmlFor="message" className="sr-only">
            What are you looking for?
          </label>
          <textarea id="message" placeholder="What are you looking for?" rows="4" className="input"></textarea>
        </div>

        {/* <button type="submit" className="inline-block w-full rounded-lg bg-blue-500 px-5 py-3 text-sm font-medium text-white">
          Submit
        </button> */}

        <CustomButton type="submit" label="Send" className="w-full rounded" />
      </form>
    </div>
  );
};

export default Contact;
