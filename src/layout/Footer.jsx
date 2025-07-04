import React from "react";

const footerLinks = [
  {
    title: "About us",
    href: "#about-us",
  },
  {
    title: "About Platform",
    href: "#about-platform",
  },
  {
    title: "Open Club",
    href: "#open-club",
  },
  {
    title: "Clubs",
    href: "#clubs",
  },
  {
    title: "FAQ",
    href: "#faq",
  },
  {
    title: "IT community",
    href: "#it-community",
  },
];

const Footer = () => {
  return (
    <footer className="bg-[#77C042]  text-white py-10 ">
      <div className="max-w-6xl  px-4 flex flex-col items-center ">
        <hr className="border-white/40 mb-9" />
        <div className="flex flex-col text-center justify-between items-center md:gap-20 md:flex-row md:justify-between text-xl font-normal gap-7 md:text-start ">
          <div className="flex flex-col gap-2">
            {footerLinks.slice(0, 2).map((link) => (
              <a key={link.title} href={link.href} className="hover:underline">
                {link.title}
              </a>
            ))}
          </div>
          <div className="flex flex-col gap-2 ">
            {footerLinks.slice(2, 4).map((link) => (
              <a key={link.title} href={link.href} className="hover:underline">
                {link.title}
              </a>
            ))}
          </div>
          <div className="flex flex-col gap-2">
            {footerLinks.slice(4).map((link) => (
              <a key={link.title} href={link.href} className="hover:underline">
                {link.title}
              </a>
            ))}
          </div>
        </div>

        <p className="text-sm mt-10">© Copyright 2025 - Clubs Union</p>
      </div>
    </footer>
  );
};

export default Footer;

// import React from "react";

// const footerLinks = [
//   { title: "About us", href: "#about-us" },
//   { title: "About Platform", href: "#about-platform" },
//   { title: "Open Club", href: "#open-club" },
//   { title: "Clubs", href: "#clubs" },
//   { title: "FAQ", href: "#faq" },
//   { title: "IT community", href: "#it-community" },
// ];

// const Footer = () => {
//   return (
//     <footer className="bg-green-500 text-white py-10">
//       <div className="max-w-6xl mx-auto px-4">
//         <hr className="border-white/40 mb-8" />
//         <div className="flex flex-col text-center md:flex-row md:justify-between md:text-start gap-8 text-lg font-light px-10">
//           <div className="flex flex-col gap-2">
//             {footerLinks.slice(0, 2).map((link) => (
//               <a key={link.title} href={link.href} className="hover:underline">
//                 {link.title}
//               </a>
//             ))}
//           </div>
//           <div className="flex flex-col gap-2">
//             {footerLinks.slice(2, 4).map((link) => (
//               <a key={link.title} href={link.href} className="hover:underline">
//                 {link.title}
//               </a>
//             ))}
//           </div>
//           <div className="flex flex-col gap-2">
//             {footerLinks.slice(4).map((link) => (
//               <a key={link.title} href={link.href} className="hover:underline">
//                 {link.title}
//               </a>
//             ))}
//           </div>
//         </div>
//         <p className="text-sm text-center mt-10">
//           © Copyright 2025 - Clubs Union
//         </p>
//       </div>
//     </footer>
//   );
// };

// export default Footer;
