import { NotificationEvent, NotificationLanguage } from './types';

export interface TemplateDefinition {
  subject?: string;
  body: string;
}

export const NOTIFICATION_TEMPLATES: Record<
  NotificationEvent,
  Record<NotificationLanguage, TemplateDefinition>
> = {
  GROUP_CREATED: {
    en: {
      subject: 'Buyer Group Created for {{model}}',
      body: 'Your buyer group for {{brand}} {{model}} in {{zone}} is now live! Target: {{targetSize}} buyers. Share with friends to unlock bulk dealer reverse auction pricing.',
    },
    hi: {
      subject: '{{model}} के लिए नया खरीदार ग्रुप शुरू हुआ',
      body: '{{zone}} में {{brand}} {{model}} के लिए आपका ग्रुप शुरू हो गया है! लक्ष्य: {{targetSize}} खरीदार। थोक डिस्काउंट अनलॉक करने के लिए ग्रुप शेयर करें।',
    },
    mr: {
      subject: '{{model}} साठी खरेदीदार गट तयार झाला',
      body: '{{zone}} मध्ये {{brand}} {{model}} साठी तुमचा गट सुरू झाला आहे! उद्दिष्ट: {{targetSize}} खरेदीदार. डीलर रिव्हर्स लिलाव सवलतीसाठी मित्रांना जोडा.',
    },
  },

  MEMBER_JOINED: {
    en: {
      subject: 'New Member Joined Your {{model}} Group',
      body: 'Great news! A new buyer just joined your {{model}} group in {{zone}}. Progress: {{currentSize}}/{{targetSize}} buyers committed.',
    },
    hi: {
      subject: 'आपके {{model}} ग्रुप में नया सदस्य जुड़ा',
      body: 'बधाई! {{zone}} में आपके {{model}} ग्रुप में नया खरीदार जुड़ गया है। अब {{currentSize}}/{{targetSize}} सदस्य हो चुके हैं।',
    },
    mr: {
      subject: 'तुमच्या {{model}} गटात नवीन सदस्य सहभागी झाला',
      body: 'आनंदाची बातमी! {{zone}} मधील तुमच्या {{model}} गटात नवीन खरेदीदार जोडला गेला आहे. आता {{currentSize}}/{{targetSize}} सदस्य झाले आहेत.',
    },
  },

  THRESHOLD_MET: {
    en: {
      subject: 'Quorum Reached! Reverse Auction Starting for {{model}}',
      body: 'Congratulations! Your {{model}} cohort in {{zone}} hit quorum with {{currentSize}} buyers. Authorized dealers are now invited to compete in a 48h sealed reverse auction.',
    },
    hi: {
      subject: 'कोरम पूरा हुआ! {{model}} का रिवर्स ऑक्शन शुरू',
      body: 'बधाई! {{zone}} में {{model}} ग्रुप ने {{currentSize}} खरीदारों के साथ कोरम पूरा कर लिया है। अधिकृत डीलरों के बीच 48 घंटे की सीलबंद बोली शुरू हो रही है।',
    },
    mr: {
      subject: 'कोरम पूर्ण! {{model}} साठी रिव्हर्स लिलाव सुरू',
      body: 'अभिनंदन! {{zone}} मधील {{model}} गटाने {{currentSize}} खरेदीदारांसह कोरम गाठला आहे. अधिकृत डीलर्समध्ये ४८ तासांचा सीलबंद लिलाव सुरू झाला आहे.',
    },
  },

  RFQ_OPEN: {
    en: {
      subject: 'Dealership RFQ Open: {{quantity}} Units for {{model}} in {{district}}',
      body: 'New Reverse Auction RFQ live! Demand batch: {{quantity}} units of {{brand}} {{model}} in {{district}}. Submit your competitive sealed quote before {{deadline}}.',
    },
    hi: {
      subject: 'डीलर RFQ बोली शुरू: {{district}} में {{model}} की {{quantity}} गाड़ियां',
      body: 'नया रिवर्स ऑक्शन RFQ उपलब्ध! {{district}} में {{brand}} {{model}} की {{quantity}} गाड़ियों का बैच। {{deadline}} से पहले अपनी सीलबंद बोली जमा करें।',
    },
    mr: {
      subject: 'डीलर RFQ लिलाव सुरू: {{district}} मध्ये {{model}} च्या {{quantity}} गाड्या',
      body: 'नवीन रिव्हर्स लिलाव RFQ उपलब्ध! {{district}} मध्ये {{brand}} {{model}} च्या {{quantity}} गाड्यांचा समूह. {{deadline}} पूर्वी तुमची सीलबंद बोली सादर करा.',
    },
  },

  BID_SUBMITTED: {
    en: {
      subject: 'New Sealed Bid Received for {{model}}',
      body: 'An authorized dealership has submitted a sealed quote for your {{model}} cohort. All bids will be decrypted and unmasked once the window closes.',
    },
    hi: {
      subject: '{{model}} के लिए नई सीलबंद बोली प्राप्त हुई',
      body: 'अधिकृत डीलरशिप ने आपके {{model}} बैच के लिए सीलबंद कोटेशन जमा किया है। बोली की अवधि समाप्त होने पर सभी कोट्स खोले जाएंगे।',
    },
    mr: {
      subject: '{{model}} साठी नवीन सीलबंद बोली प्राप्त झाली',
      body: 'अधिकृत डीलरशिपद्वारे तुमच्या {{model}} समूहासाठी सीलबंद कोटेशन दाखल केले गेले आहे. लिलावाची मुदत संपल्यावर सर्व कोट्स खुले केले जातील.',
    },
  },

  VOTING_OPEN: {
    en: {
      subject: 'Quotes Unmasked: Vote for Your Winning Dealer for {{model}}',
      body: 'Bidding closed! {{quoteCount}} dealer quotes are now visible with full landed on-road breakdown. Review the top offer saving {{savings}} and cast your vote within 24h.',
    },
    hi: {
      subject: 'कोटेशन खुले: {{model}} के लिए अपने डीलर को वोट करें',
      body: 'बोली बंद हो गई है! {{quoteCount}} डीलरों के ऑन-रोड कोट्स अब उपलब्ध हैं। {{savings}} बचत वाले सर्वोत्तम ऑफर की समीक्षा करें और 24 घंटे में वोट दें।',
    },
    mr: {
      subject: 'कोट्स उघडले: {{model}} साठी विजयी डीलरला मतदान करा',
      body: 'लिलाव संपला! {{quoteCount}} डीलर्सचे संपूर्ण ऑन-रोड कोट्स उपलब्ध आहेत. {{savings}} बचत देणाऱ्या सर्वोत्तम ऑफरची पाहणी करून २४ तासांत मतदान करा.',
    },
  },

  WINNER_SELECTED: {
    en: {
      subject: 'Winning Dealer Selected: {{dealerName}} Won {{model}} Cohort',
      body: 'The cohort has voted! {{dealerName}} won the batch reverse auction with a total landed saving of {{savings}}. Please proceed to individual booking confirmation.',
    },
    hi: {
      subject: 'विजेता डीलर चुना गया: {{dealerName}} ने जीता {{model}} बैच',
      body: 'ग्रुप का निर्णय आ गया है! {{dealerName}} ने {{savings}} की बचत के साथ रिवर्स ऑक्शन जीता है। कृपया अपनी बुकिंग पुष्टि के लिए आगे बढ़ें।',
    },
    mr: {
      subject: 'विजयी डीलर निश्चित: {{dealerName}} ने जिंकला {{model}} गट',
      body: 'गटाचे मतदान पूर्ण झाले! {{dealerName}} ने {{savings}} च्या बचतीसह लिलाव जिंकला आहे. कृपया वैयक्तिक बुकिंग पुष्टीकरणासाठी पुढे जा.',
    },
  },

  BOOKING_CONFIRMED: {
    en: {
      subject: 'Booking Confirmed: ₹25,000 Deposit Held Pending Delivery',
      body: 'Booking ID {{bookingId}} confirmed! Your deposit of ₹25,000 is safely held by the payment aggregator. Dealership {{dealerName}} is preparing allocation.',
    },
    hi: {
      subject: 'बुकिंग कन्फर्म: ₹25,000 डिलीवरी तक सुरक्षित जमा',
      body: 'बुकिंग आईडी {{bookingId}} कन्फर्म हो गई है! आपका ₹25,000 डिपॉजिट डिलीवरी तक पेमेंट एग्रीगेटर के पास सुरक्षित है। डीलर गाड़ी आवंटित कर रहा है।',
    },
    mr: {
      subject: 'बुकिंग निश्चित: ₹25,000 डिलिव्हरीपर्यंत सुरक्षित ठेवले',
      body: 'बुकिंग आयडी {{bookingId}} निश्चित झाली! तुमची ₹२५,००० अनामत रक्कम डिलिव्हरीपर्यंत सुरक्षित ठेवली आहे. डीलर गाडी वाटप करत आहे.',
    },
  },

  SHIPMENT_DISPATCHED: {
    en: {
      subject: 'Your {{model}} is In Transit to {{hubName}}',
      body: 'Carrier flatbed has dispatched from the yard with your {{model}}. GPS tracking is active. Current ETA to {{hubName}}: {{etaDays}} days.',
    },
    hi: {
      subject: 'आपकी {{model}} {{hubName}} के लिए रवाना हो चुकी है',
      body: 'आपकी {{model}} लेकर कैरियर यार्ड से निकल चुका है। जीपीएस ट्रैकिंग चालू है। {{hubName}} पहुंचने का अनुमानित समय: {{etaDays}} दिन।',
    },
    mr: {
      subject: 'तुमची {{model}} {{hubName}} कडे रवाना झाली आहे',
      body: 'तुमची {{model}} घेऊन फ्लॅटबेड वाहक यार्डमधून निघाला आहे. जीपीएस ट्रॅकिंग सुरू आहे. {{hubName}} येथे पोहोचण्याचा अंदाज: {{etaDays}} दिवस.',
    },
  },

  DELIVERY_HANDOVER: {
    en: {
      subject: 'Vehicle Arrived! Verify PDI & Handover OTP: {{otp}}',
      body: 'Your {{model}} has arrived at {{hubName}}. Inspect odometer (<100 km) and sign PDI checklist. Share Handover OTP {{otp}} only after satisfying all checks.',
    },
    hi: {
      subject: 'गाड़ी पहुंच गई! PDI जांचें और हैंडओवर OTP बताएं: {{otp}}',
      body: 'आपकी {{model}} {{hubName}} पर आ चुकी है। ओडोमीटर (<100 किमी) जांचें और PDI साइन करें। पूर्ण संतुष्टि के बाद ही हैंडओवर OTP {{otp}} डीलर को दें।',
    },
    mr: {
      subject: 'गाडी आली आहे! PDI तपासा आणि हँडओव्हर OTP द्या: {{otp}}',
      body: 'तुमची {{model}} {{hubName}} वर पोहोचली आहे. ओडोमीटर (<१०० किमी) तपासा आणि PDI वर स्वाक्षरी करा. सर्व तपासण्या पूर्ण झाल्यावरच OTP {{otp}} शेअर करा.',
    },
  },
};

export function renderTemplate(
  event: NotificationEvent,
  lang: NotificationLanguage,
  variables: Record<string, string | number>,
): { subject?: string; body: string } {
  const eventTemplates = NOTIFICATION_TEMPLATES[event] || NOTIFICATION_TEMPLATES.GROUP_CREATED;
  const template = eventTemplates[lang] || eventTemplates.en;

  let body = template.body;
  let subject = template.subject;

  for (const [key, value] of Object.entries(variables)) {
    const pattern = new RegExp(`{{${key}}}`, 'g');
    body = body.replace(pattern, String(value));
    if (subject) {
      subject = subject.replace(pattern, String(value));
    }
  }

  return { subject, body };
}
