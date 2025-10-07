const services = [
  {
    title: "Dental Checkup",
    image: "/images/dental check up.jpg",
    description:
      "A dental checkup is a routine examination that helps identify any potential dental issues early on. It typically includes a thorough cleaning, examination, and sometimes X-rays to ensure your teeth and gums are healthy.",
    btn: "Book Now",
  },
  {
    title: "Dental Extraction",
    image: "/images/dental extraction.jpg",
    description:
      "Dental extraction is a surgical procedure to remove a tooth from the mouth. Dentists perform dental extractions for a variety of reasons, such as tooth decay, gum disease, or overcrowding.",
    btn: "Book Now",
  },
   {
    title: "Dental Restoration",
    image: "/images/dental restoration.jpg",
    description: "Dental restoration is a process of restoring a tooth to its original shape, function, and appearance using composite resin, porcelain, or gold.",
    btn: "Book Now"
  },
  {
    title: "Dental Surgery",
    image: "/images/dental surgery.jpg",
    description: "Dental surgery involves procedures like extractions, gum surgeries, and jaw corrections. These surgeries are performed by oral surgeons.",
    btn: "Book Now"
  },
  {
    title: "Oral Prophylaxis",
    image: "/images/oral prophylaxis.jpg",
    description: "Oral prophylaxis is a preventive dental cleaning to remove plaque, tartar, and stains. Recommended every 6 months.",
    btn: "Book Now"
  },
  {
    title: "Orthodontics",
    image: "/images/orthodontics.jpg",
    description: "Orthodontics involves braces or aligners to straighten teeth and fix bite issues, improving function and aesthetics.",
    btn: "Book Now"
  },
  {
    title: "Prosthodontics",
    image: "/images/prosthodontics.jpg",
    description: "Prosthodontics focuses on replacing missing teeth with crowns, bridges, dentures, or implants.",
    btn: "Book Now"
  }

];

function renderServices() {
  const container = document.getElementById("serviceGrid");
  container.innerHTML = ""; // Clear existing

  services.forEach((service) => {
    const card = document.createElement("div");
    card.className =
      "bg-blue-50 rounded-2xl shadow p-4 flex flex-col md:flex-row gap-4";

    card.innerHTML = `
      <img src="${service.image}" alt="${service.title}" class="w-full md:w-1/3 h-48 object-cover rounded-xl" />
      <div class="flex flex-col justify-between md:w-2/3">
        <h3 class="text-xl md:text-2xl font-bold mb-2 text-blue-800">${service.title}</h3>
        <p class="text-gray-700 mb-4">${service.description}</p>
        <button class="bg-blue-500 text-white px-5 py-2 rounded-full w-max hover:bg-blue-600 transition">${service.btn}</button>
      </div>
    `;

    container.appendChild(card);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  renderServices();
});
