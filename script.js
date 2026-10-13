/* ---------------------------------------------------------------

   SETTINGS: fill these in before the page goes live.

   formEndpoint   URL that accepts a JSON POST (CRM, webhook, API route)

   whatsappNumber Country code plus number, digits only, e.g. 919812345678

   If formEndpoint is empty and whatsappNumber is set, the form opens

   WhatsApp with the request filled in.

\---------------------------------------------------------------- */

var KEONA = {

  formEndpoint: "",

  whatsappNumber: "918884160602",

  thankYouUrl: "/office-flower-subscription/thank_you"

};



(function () {

  var $ = function (s, r) { return (r || document).querySelector(s); };

  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };



  var FREQ = {

    weekly: { label: "every week", weeks: [1, 1, 1, 1], note: "4 visits a month" },

    fortnightly: { label: "every two weeks", weeks: [1, 0, 1, 0], note: "2 visits a month" },

    monthly: { label: "once a month", weeks: [1, 0, 0, 0], note: "1 visit a month" }

  };



  function val(name) { var el = $('input[name="' + name + '"]:checked'); return el ? el.value : ""; }

  function joinList(a) {

    if (a.length < 2) return a.join("");

    return a.slice(0, -1).join(", ") + " and " + a[a.length - 1];

  }



  function render() {

    var freq = val("freq") || val("hfreq") || "weekly";
    if (!FREQ[freq]) freq = "weekly";

    var hf = $('input[name="hfreq"][value="' + freq + '"]'); if (hf) hf.checked = true;

    var spaces = $$('input[name="spaces"]:checked').map(function (i) { return i.value; });

    var parts = ["Flowers for " + (spaces.length ? joinList(spaces) : "your office")];

    if (val("count")) parts.push(val("count"));

    parts.push(val("style"));

    parts.push(FREQ[freq].label);

    var text = parts.join(", ") + ".";

    if ($("#summary")) $("#summary").textContent = text;

    if ($("#f-subscription")) $("#f-subscription").value = text;

    if ($("#rhythm-note")) $("#rhythm-note").textContent = FREQ[freq].note;

    $$(".week").forEach(function (w, i) { w.classList.toggle("on", !!FREQ[freq].weeks[i]); });

  }

  // Tick boxes in the hero form set the same frequency as the builder

  $$('input[name="hfreq"]').forEach(function (i) {

    i.addEventListener("change", function () {

      $('input[name="freq"][value="' + i.value + '"]').checked = true;

      render();

    });

  });



  var builderTouched = false;

  $$('input[name="spaces"],input[name="count"],input[name="freq"],input[name="style"]').forEach(function (i) {

    i.addEventListener("change", function () { builderTouched = true; render(); });

  });



  // Carousel

  var track = $("#track"), slides = $$(".slide", track);

  var prev = $("#car-prev"), next = $("#car-next"), count = $("#car-count");

  function step() { return slides[0].getBoundingClientRect().width + parseFloat(getComputedStyle(track).columnGap || 20); }

  function sync() {

    var max = track.scrollWidth - track.clientWidth;

    var i = Math.round(track.scrollLeft / step());

    if (track.scrollLeft >= max - 2) i = Math.max(i, slides.length - Math.max(1, Math.round(track.clientWidth / step())));

    var perView = Math.max(1, Math.round(track.clientWidth / step()));

    var last = Math.min(slides.length, i + perView);

    count.textContent = (perView > 1 ? (i + 1) + " to " + last : (i + 1)) + " / " + slides.length;

    prev.disabled = track.scrollLeft <= 2;

    next.disabled = track.scrollLeft >= max - 2;

  }

  var smooth = !(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);

  function move(dir) { track.scrollBy({ left: dir * step(), behavior: smooth ? "smooth" : "auto" }); }

  prev.addEventListener("click", function () { move(-1); });

  next.addEventListener("click", function () { move(1); });

  track.addEventListener("keydown", function (e) {

    if (e.key === "ArrowRight") { e.preventDefault(); move(1); }

    if (e.key === "ArrowLeft") { e.preventDefault(); move(-1); }

  });

  var t; track.addEventListener("scroll", function () { clearTimeout(t); t = setTimeout(sync, 60); }, { passive: true });

  window.addEventListener("resize", sync);

  sync();



  // WhatsApp button on the mobile bar

  var wa = $("#bar-wa");

  if (KEONA.whatsappNumber) {

    wa.hidden = false;

    wa.href = "https://wa.me/" + KEONA.whatsappNumber + "?text=" + encodeURIComponent("Hi Keona, I would like a quote for an office flower subscription.");

    wa.target = "_blank"; wa.rel = "noopener";

  }



  // Hide the mobile bar while a quote form is on screen

  if ("IntersectionObserver" in window) {

    var onScreen = 0;

    var barWatch = new IntersectionObserver(function (entries) {

      entries.forEach(function (en) { onScreen += en.isIntersecting ? 1 : (en.target._seen ? -1 : 0); en.target._seen = en.isIntersecting; });

      $("#bar").classList.toggle("away", onScreen > 0);

    }, { threshold: 0.15 });

    $$(".qform").forEach(function (f) { barWatch.observe(f); });

  }



  // Play the flower drawing when it scrolls into view

  var art = $("#proof-art");

  if (art) {

    if ("IntersectionObserver" in window) {

      new IntersectionObserver(function (en, io) {

        if (en[0].isIntersecting) { art.classList.add("play"); io.disconnect(); }

      }, { threshold: 0.35 }).observe(art);

    } else { art.classList.add("play"); }

  }



  // Phone clicks, so calls can be tracked as conversions

  $$('a[href^="tel:"]').forEach(function (a) {

    a.addEventListener("click", function () {

      window.dataLayer = window.dataLayer || [];

      window.dataLayer.push({ event: "phone_click", click_location: a.getAttribute("data-loc") || "footer" });

    });

  });



  // Campaign details from the landing URL, sent with every lead

  var TRACK = {};

  try {

    var qs = new URLSearchParams(location.search);

    ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid", "gbraid", "wbraid", "fbclid"].forEach(function (k) {

      var v = qs.get(k); if (v) TRACK[k] = v;

    });

  } catch (e) { }



  // Quote forms: the hero form and the builder form share this logic

  function digitsOf(v) { return v.replace(/\D/g, "").replace(/^(91|0)(?=\d{10}$)/, ""); }

  var RULES = {

    name: function (v) { return v.trim().length > 1; },

    company: function (v) { return v.trim().length > 1; },

    email: function (v) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());
    },

    phone: function (v) { return /^[6-9]\d{9}$/.test(digitsOf(v)); },

    city: function (v) { return v.trim().length > 1; }

  };

  function checkField(input) {

    var ok = RULES[input.name](input.value);

    input.closest(".field").classList.toggle("bad", !ok);

    input.setAttribute("aria-invalid", ok ? "false" : "true");

    return ok;

  }



  $$(".qform").forEach(function (form) {
    var msg = $(".form-msg", form);
    var btn = $("button[type=submit]", form);
    var done = form.parentNode.querySelector(".form-done");
    var inputs = $$("input[required]", form);

    function show(type, text) {
      if (!msg) return;
      msg.className = "form-msg show " + type;
      msg.textContent = text;
    }

    inputs.forEach(function (input) {
      input.addEventListener("blur", function () {
        if (input.value.trim()) checkField(input);
      });
      input.addEventListener("input", function () {
        if (input.closest(".field") && input.closest(".field").classList.contains("bad")) {
          checkField(input);
        }
      });
    });

    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      var f = form.elements;
      if (f.website && f.website.value) return;

      var ok = inputs.map(checkField).every(Boolean);
      if (!ok) {
        var firstBad = $(".field.bad input", form);
        if (firstBad) firstBad.focus();
        return;
      }

      var source = form.getAttribute("data-source") || "unknown";
      var selectedFrequency = $("input[name='hfreq']:checked", form);
      if (!selectedFrequency) selectedFrequency = $("input[name='freq']:checked");
      var data = {
        name: f.name.value.trim(),
        company: f.company.value.trim(),
        email: f.email.value.trim(),
        phone: digitsOf(f.phone.value),
        city: f.city.value.trim(),
        notes: f.notes ? f.notes.value.trim() : "",
        subscription: (source === "builder" || builderTouched) && $("#f-subscription")
          ? $("#f-subscription").value
          : "",
        frequency: selectedFrequency ? selectedFrequency.value : "weekly",
        wholeYear: !!(f.year && f.year.checked),
        formUsed: source,

        page: location.href,
        tracking: TRACK,
        website: f.website ? f.website.value : ""
      };


function finish() {
  window.dataLayer = window.dataLayer || [];

  window.dataLayer.push({
    event: "office_flower_subscription_lead",
    form_used: source,
    frequency: data.frequency,
    whole_year: data.wholeYear
  });

  window.location.assign(KEONA.thankYouUrl);
}


      function fail(text) {
        show("warn", text);
        if (btn) {
          btn.disabled = false;
          btn.textContent = "Request my quote";
        }
      }

      if (btn) {
        btn.disabled = true;
        btn.textContent = "Sending...";
      }
      if (msg) {
        msg.className = "form-msg";
        msg.textContent = "";
      }

      try {
        // 1) Save the lead to Supabase through the secure Vercel API.
        var dbResponse = await fetch("/office-flower-subscription/api/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data)
        });
        var dbResult = {};
        try { dbResult = await dbResponse.json(); } catch (_) { }
        if (!dbResponse.ok || !dbResult.success) {
          throw new Error(dbResult.error || "Your request could not be saved. Please try again.");
        }

        // Supabase saved the lead successfully; continue to the thank-you page.
        finish();
      } catch (error) {
        console.error("Quote submission error:", error);
        fail(error.message || "Your request could not be submitted. Please try again.");
      }
    });
  });

  // FAQ schema built from the questions on the page

  var faq = $$(".faq details").map(function (d) {

    return { "@type": "Question", name: $("summary", d).textContent.trim(), acceptedAnswer: { "@type": "Answer", text: $("p", d).textContent.trim() } };

  });

  var ld = document.createElement("script");

  ld.type = "application/ld+json";

  ld.textContent = JSON.stringify({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq });

  document.head.appendChild(ld);



  render();

})();