/* ---------------------------------------------------------------
   SETTINGS: fill these in before the page goes live.
   formEndpoint   URL that accepts a JSON POST (CRM, webhook, API route)
   whatsappNumber Country code plus number, digits only, e.g. 919812345678
   If formEndpoint is empty and whatsappNumber is set, the form opens
   WhatsApp with the request filled in.
---------------------------------------------------------------- */
var KEONA = {
  formEndpoint: "",
  whatsappNumber: "",
  hubspotPortalId: "247625054",
  hubspotFormGuid: "847051d0-fde2-4b8f-9549-be5f187938dd",
  thankYouUrl: "/thank-you.html"
};

(function () {
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  var FREQ = {
    weekly:      { label: "every week",      weeks: [1, 1, 1, 1], note: "4 visits a month" },
    fortnightly: { label: "every two weeks", weeks: [1, 0, 1, 0], note: "2 visits a month" },
    monthly:     { label: "once a month",    weeks: [1, 0, 0, 0], note: "1 visit a month" }
  };

  function val(name) { var el = $('input[name="' + name + '"]:checked'); return el ? el.value : ""; }
  function joinList(a) {
    if (a.length < 2) return a.join("");
    return a.slice(0, -1).join(", ") + " and " + a[a.length - 1];
  }

  function render() {
    var freq = val("freq");
    var hf = $('input[name="hfreq"][value="' + freq + '"]'); if (hf) hf.checked = true;
    var spaces = $$('input[name="spaces"]:checked').map(function (i) { return i.value; });
    var parts = ["Flowers for " + (spaces.length ? joinList(spaces) : "your office")];
    if (val("count")) parts.push(val("count"));
    parts.push(val("style"));
    parts.push(FREQ[freq].label);
    var text = parts.join(", ") + ".";
    $("#summary").textContent = text;
    $("#f-subscription").value = text;
    $("#rhythm-note").textContent = FREQ[freq].note;
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
  } catch (e) {}

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
    var msg = $(".form-msg", form), btn = $("button[type=submit]", form);
    var done = form.parentNode.querySelector(".form-done");
    var inputs = $$("input[required]", form);
    function show(type, text) { msg.className = "form-msg show " + type; msg.textContent = text; }

    inputs.forEach(function (i) {
      i.addEventListener("blur", function () { if (i.value.trim()) checkField(i); });
      i.addEventListener("input", function () { if (i.closest(".field").classList.contains("bad")) checkField(i); });
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var f = form.elements;
      if (f.website.value) return;                       // spam trap: people never see this field
      var ok = inputs.map(checkField).every(Boolean);
      if (!ok) { $(".field.bad input", form).focus(); return; }

      var source = form.getAttribute("data-source");
      var data = {
        name: f.name.value.trim(),
        company: f.company.value.trim(),
        email: f.email.value.trim(),
        phone: digitsOf(f.phone.value),
        city: f.city.value.trim(),
        notes: f.notes.value.trim(),
        subscription: (source === "builder" || builderTouched) ? $("#f-subscription").value : "",
        frequency: val("freq"),
        wholeYear: f.year.checked,
        formUsed: source,
        page: location.href,
        tracking: TRACK
      };
      function finish() {
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({ event: "office_flower_subscription_lead", form_used: source, frequency: data.frequency, whole_year: data.wholeYear });
        if (KEONA.thankYouUrl) { location.href = KEONA.thankYouUrl; return; }
        $(".done-text", done).textContent = "Thank you, " + data.name.split(" ")[0] + ". We have your request and will get back to you on " + data.phone + " with a quote.";
        form.hidden = true; done.hidden = false; done.focus();
      }
      function fail(text) { show("warn", text); btn.disabled = false; btn.textContent = "Request my quote"; }

     if (KEONA.hubspotPortalId && KEONA.hubspotFormGuid) {

  btn.disabled = true;
  btn.textContent = "Sending...";

  var hubspotPayload = {
    fields: [
      {
        name: "firstname",
        value: data.name
      },
      {
        name: "email",
        value: data.email
      },
      {
        name: "company",
        value: data.company
      },
      {
        name: "phone",
        value: data.phone
      },
      {
        name: "city",
        value: data.city
      }
    ]
  };

  fetch(
    "https://api.hsforms.com/submissions/v3/integration/submit/" +
    KEONA.hubspotPortalId +
    "/" +
    KEONA.hubspotFormGuid,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(hubspotPayload)
    }
  )
  .then(function (response) {

    if (!response.ok) {
      return response.text().then(function (errorText) {
        console.error("HubSpot error:", errorText);
        throw new Error("HubSpot submission failed");
      });
    }

    return response.json();

  })
  .then(function () {

    finish();

  })
  .catch(function (error) {

    console.error("HubSpot submission error:", error);

    fail(
      "Your request could not be submitted. Please try again."
    );

  });

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