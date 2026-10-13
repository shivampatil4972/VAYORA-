// Hindi. Keys are the English strings in the source; placeholders in {braces} must be
// kept exactly. Written without review by a native speaker: the wording on money,
// refunds and safety in particular should be checked before anyone relies on it.

export const hi: Record<string, string> = {
  // Navigation and shell
  'Page not found': 'पृष्ठ नहीं मिला',
  'There is nothing at this address.': 'इस पते पर कुछ नहीं है।',
  'Find a ride': 'सवारी खोजें',
  'My bookings': 'मेरी बुकिंग',
  'My rides': 'मेरी सवारियाँ',
  'Publish a ride': 'सवारी प्रकाशित करें',
  'My vehicles': 'मेरे वाहन',
  Earnings: 'कमाई',
  Overview: 'सारांश',
  Reports: 'शिकायतें',
  Members: 'सदस्य',
  'Booking durability': 'बुकिंग की स्थिरता',
  'Audit log': 'ऑडिट लॉग',
  Notifications: 'सूचनाएँ',
  unread: 'अपठित',
  Language: 'भाषा',
  'Skip to content': 'सीधे सामग्री पर जाएँ',
  Main: 'मुख्य',
  'Sign out': 'साइन आउट',
  'Keep it': 'रहने दें',
  'Loading…': 'लोड हो रहा है…',
  'Try again': 'फिर से कोशिश करें',

  // Payments and refunds
  'Payments here are simulated. No card, UPI or wallet is contacted and no money is taken or paid out.':
    'यहाँ भुगतान केवल अनुकरण (सिमुलेशन) है। किसी कार्ड, UPI या वॉलेट से संपर्क नहीं किया जाता और न कोई पैसा लिया जाता है, न दिया जाता है।',
  'If you cancel': 'यदि आप रद्द करते हैं',
  'Before the driver accepts: everything back, including the service fee.':
    'चालक के स्वीकार करने से पहले: सेवा शुल्क सहित पूरी राशि वापस।',
  '{hours} hours or more before boarding': 'सवार होने से {hours} घंटे या उससे अधिक पहले',
  '{from} to {to} hours before boarding': 'सवार होने से {from} से {to} घंटे पहले',
  '{when}: the whole fare back.': '{when}: पूरा किराया वापस।',
  '{when}: {share} of the fare back.': '{when}: किराए का {share} वापस।',
  'Less than {hours} hours before boarding: nothing back.': 'सवार होने से {hours} घंटे से कम पहले: कुछ भी वापस नहीं।',
  'Once the driver has accepted, the service fee is not returned.': 'चालक के स्वीकार करने के बाद सेवा शुल्क वापस नहीं किया जाता।',
  'If the driver cancels or declines: everything back.': 'यदि चालक रद्द या अस्वीकार करता है: पूरी राशि वापस।',

  // Ratings
  'No ratings yet': 'अभी कोई रेटिंग नहीं',
  '{average} out of 5 · {count} rating': '5 में से {average} · {count} रेटिंग',
  '{average} out of 5 · {count} ratings': '5 में से {average} · {count} रेटिंग',
  '{n} star': '{n} स्टार',
  '{n} stars': '{n} स्टार',
  'Comment (optional, shown on their profile)': 'टिप्पणी (वैकल्पिक, उनकी प्रोफ़ाइल पर दिखेगी)',
  'Sending…': 'भेजा जा रहा है…',
  'Send rating': 'रेटिंग भेजें',
  'Rate your driver': 'अपने चालक को रेटिंग दें',
  'Rate {name}': '{name} को रेटिंग दें',

  // Reports
  'Unsafe driving': 'असुरक्षित ड्राइविंग',
  Harassment: 'उत्पीड़न',
  'Did not turn up': 'नहीं आए',
  Fraud: 'धोखाधड़ी',
  'Something else': 'कुछ और',
  'Your report has been sent to the administrators. They will not tell {name} who filed it.':
    'आपकी शिकायत प्रशासकों को भेज दी गई है। वे {name} को यह नहीं बताएँगे कि शिकायत किसने की।',
  'Report {name}': '{name} की शिकायत करें',
  'What happened?': 'क्या हुआ?',
  'Choose one': 'एक चुनें',
  'Details (optional)': 'विवरण (वैकल्पिक)',
  'If you are in danger now, call 112. A report here is read by an administrator later, not straight away.':
    'यदि आप अभी खतरे में हैं, तो 112 पर कॉल करें। यहाँ की गई शिकायत प्रशासक बाद में पढ़ते हैं, तुरंत नहीं।',
  'Send report': 'शिकायत भेजें',
  'Never mind': 'रहने दें',

  // Statuses
  'Waiting for the driver': 'चालक के उत्तर की प्रतीक्षा',
  Confirmed: 'पुष्टि हो गई',
  'Declined by the driver': 'चालक ने अस्वीकार किया',
  Cancelled: 'रद्द',
  Completed: 'पूरी हुई',
  'Did not board': 'सवार नहीं हुए',
  Scheduled: 'निर्धारित',
  'On the road': 'रास्ते में',

  // Places and units
  Kolhapur: 'कोल्हापुर',
  Karad: 'कराड',
  Satara: 'सातारा',
  Pune: 'पुणे',
  '{n} m': '{n} मी',
  '{n} km': '{n} किमी',
  '{m} min': '{m} मिनट',
  '{h} h': '{h} घंटे',
  '{h} h {m} min': '{h} घंटे {m} मिनट',

  // Validation
  'Enter your email': 'अपना ईमेल दर्ज करें',
  'Enter a valid email': 'मान्य ईमेल दर्ज करें',
  'Enter your password': 'अपना पासवर्ड दर्ज करें',
  'Enter your name': 'अपना नाम दर्ज करें',
  'Use at least 8 characters': 'कम से कम 8 अक्षर रखें',
  'Use at most 72 characters': 'अधिकतम 72 अक्षर रखें',
  'Choose how you will use JOURNEX': 'चुनें कि आप JOURNEX का उपयोग कैसे करेंगे',
  'Choose where you start': 'चुनें कि आप कहाँ से चलेंगे',
  'Choose where you are going': 'चुनें कि आप कहाँ जा रहे हैं',
  'Choose a date': 'तारीख चुनें',
  'At least 1 seat': 'कम से कम 1 सीट',
  'At most 8 seats': 'अधिकतम 8 सीटें',
  'The destination must come after the starting point on the way to Pune':
    'पुणे की ओर जाते हुए गंतव्य, शुरुआती स्थान के बाद आना चाहिए',
  'Enter the make': 'कंपनी का नाम दर्ज करें',
  'Enter the model': 'मॉडल दर्ज करें',
  'Too old': 'बहुत पुराना',
  'Check the year': 'वर्ष जाँचें',
  'At least 2, counting the driver': 'चालक सहित कम से कम 2',
  'At most 9': 'अधिकतम 9',
  'Choose a vehicle': 'वाहन चुनें',
  'Choose when you leave': 'चुनें कि आप कब निकलेंगे',
  'Offer at least 1 seat': 'कम से कम 1 सीट दें',
  'Choose a time in the future': 'आगे का कोई समय चुनें',
  'A ride needs at least two stops': 'सवारी में कम से कम दो पड़ाव होने चाहिए',
  'Enter whole minutes, up to two days': 'पूरे मिनट दर्ज करें, अधिकतम दो दिन',
  'Enter a price of 0 or more': '0 या उससे अधिक कीमत दर्ज करें',
  'Must be later than the stop before': 'पिछले पड़ाव से बाद का होना चाहिए',

  // Booking durability (administrator)
  "Each figure is a model's estimate that the passenger will not cancel before departure. The model was trained on simulated data only and separates risky from safe bookings weakly. It is not a fact about any person and must not be used to decline, penalise or price anyone.":
    'हर आँकड़ा एक मॉडल का अनुमान है कि यात्री प्रस्थान से पहले बुकिंग रद्द नहीं करेगा। मॉडल को केवल कृत्रिम (सिम्युलेटेड) डेटा पर प्रशिक्षित किया गया है और यह जोखिम वाली तथा सुरक्षित बुकिंग में कमज़ोर ढंग से ही अंतर कर पाता है। यह किसी व्यक्ति के बारे में तथ्य नहीं है और इसका उपयोग किसी को अस्वीकार करने, दंडित करने या उसके लिए कीमत तय करने में नहीं किया जाना चाहिए।',
  'Scoring…': 'अनुमान लगाया जा रहा है…',
  'Score bookings now': 'अभी बुकिंग का अनुमान लगाएँ',
  'Another scoring run is in progress.': 'अनुमान की एक और प्रक्रिया पहले से चल रही है।',
  '{scored} scored, {already} already scored today, {failed} could not be scored.':
    '{scored} का अनुमान लगा, {already} का आज पहले ही लग चुका था, {failed} का नहीं लग सका।',
  'The model service did not answer for some bookings. They are unchanged; run it again later.':
    'कुछ बुकिंग के लिए मॉडल सेवा ने उत्तर नहीं दिया। वे जस की तस हैं; बाद में फिर चलाएँ।',
  'No confirmed booking has been scored yet.': 'अभी तक किसी पुष्ट बुकिंग का अनुमान नहीं लगाया गया है।',
  'Latest durability estimate of each confirmed booking': 'हर पुष्ट बुकिंग का नवीनतम स्थिरता अनुमान',
  Booking: 'बुकिंग',
  Passenger: 'यात्री',
  Trip: 'यात्रा',
  Leaves: 'प्रस्थान',
  Estimate: 'अनुमान',
  Model: 'मॉडल',
  Scored: 'अनुमान का समय',

  // Signing in
  'Sign in': 'साइन इन करें',
  Email: 'ईमेल',
  Password: 'पासवर्ड',
  'Signing in…': 'साइन इन हो रहा है…',
  'New here?': 'पहली बार आए हैं?',
  'Create an account': 'खाता बनाएँ',
  'Full name': 'पूरा नाम',
  'At least 8 characters.': 'कम से कम 8 अक्षर।',
  'I want to': 'मैं चाहता/चाहती हूँ',
  'An account is either a passenger or a driver. This cannot be changed later.':
    'एक खाता या तो यात्री का होता है या चालक का। इसे बाद में बदला नहीं जा सकता।',
  'Find rides as a passenger': 'यात्री के रूप में सवारी खोजना',
  'Offer rides as a driver': 'चालक के रूप में सवारी देना',
  'Creating…': 'बनाया जा रहा है…',
  'Create account': 'खाता बनाएँ',
  'Already have an account?': 'पहले से खाता है?',

  // Back office
  Passengers: 'यात्री',
  Drivers: 'चालक',
  Administrators: 'प्रशासक',
  Driver: 'चालक',
  Administrator: 'प्रशासक',
  'None yet.': 'अभी कुछ नहीं।',
  '{n} report is waiting.': '{n} शिकायत प्रतीक्षा में है।',
  '{n} reports are waiting.': '{n} शिकायतें प्रतीक्षा में हैं।',
  'Open the queue': 'सूची खोलें',
  'Members by role': 'भूमिका के अनुसार सदस्य',
  'Rides by status': 'स्थिति के अनुसार सवारियाँ',
  'Bookings by status': 'स्थिति के अनुसार बुकिंग',
  'Suspended members: {n}': 'निलंबित सदस्य: {n}',
  'No reports are waiting.': 'कोई शिकायत प्रतीक्षा में नहीं है।',
  '{reason}: {reporter} about': '{reason}: {reporter} ने शिकायत की, इनके बारे में:',
  'Filed {time}': '{time} को दर्ज',
  'booking #{id}': 'बुकिंग #{id}',
  'Note for report #{id}': 'शिकायत #{id} के लिए टिप्पणी',
  'Kept with the report. Sent to the member if you warn them.':
    'शिकायत के साथ रखी जाती है। यदि आप सदस्य को चेतावनी देते हैं तो उन्हें भेजी जाती है।',
  Dismiss: 'खारिज करें',
  'Warn member': 'सदस्य को चेतावनी दें',
  'Suspend member': 'सदस्य को निलंबित करें',
  'Yes, suspend {name}': 'हाँ, {name} को निलंबित करें',
  'Name or email': 'नाम या ईमेल',
  Search: 'खोजें',
  'No member matches.': 'कोई सदस्य नहीं मिला।',
  'Members, newest first': 'सदस्य, सबसे नए पहले',
  Name: 'नाम',
  Role: 'भूमिका',
  Joined: 'शामिल हुए',
  Standing: 'स्थिति',
  Suspended: 'निलंबित',
  'Reinstate {name}': '{name} को बहाल करें',
  Active: 'सक्रिय',
  'Every administrative action, newest first. Entries cannot be edited or removed.':
    'हर प्रशासनिक कार्रवाई, सबसे नई पहले। प्रविष्टियों को बदला या हटाया नहीं जा सकता।',
  'No administrative action has been recorded.': 'कोई प्रशासनिक कार्रवाई दर्ज नहीं है।',
  'Administrative actions': 'प्रशासनिक कार्रवाइयाँ',
  When: 'कब',
  Who: 'किसने',
  Action: 'कार्रवाई',
  On: 'किस पर',
  Detail: 'विवरण',

  // Vehicles
  'Add a vehicle before you publish a ride.': 'सवारी प्रकाशित करने से पहले एक वाहन जोड़ें।',
  '{n} seats including yours': 'आपकी सीट सहित {n} सीटें',
  'Add a vehicle': 'वाहन जोड़ें',
  Make: 'कंपनी',
  'Year (optional)': 'वर्ष (वैकल्पिक)',
  'Colour (optional)': 'रंग (वैकल्पिक)',
  Seats: 'सीटें',
  "Every seat in the vehicle, counting the driver's.": 'वाहन की हर सीट, चालक की सीट सहित।',
  'Adding…': 'जोड़ा जा रहा है…',
  'Add vehicle': 'वाहन जोड़ें',

  // Publishing a ride
  'Route and meeting points': 'मार्ग और मिलने के स्थान',
  'A click on the map moves the meeting point for': 'नक्शे पर क्लिक करने से इसका मिलने का स्थान बदलेगा',
  'Each starts at the town centre. Put it where passengers should actually find you.':
    'हर स्थान शुरू में शहर के केंद्र पर होता है। इसे वहाँ रखें जहाँ यात्री आपको वास्तव में मिलें।',
  '{town} meeting point': '{town} में मिलने का स्थान',
  'Map of your stops: {stops}': 'आपके पड़ावों का नक्शा: {stops}',
  'Working out the route…': 'मार्ग निकाला जा रहा है…',
  'Work out the route': 'मार्ग निकालें',
  'Use the suggested prices and times': 'सुझाई गई कीमतें और समय अपनाएँ',
  '{km} km by road, about {time} of driving.': 'सड़क से {km} किमी, लगभग {time} की ड्राइविंग।',
  'About {km} km in a straight line. The routing service is unavailable, so this is not a road distance and the times are rough guesses.':
    'सीधी रेखा में लगभग {km} किमी। मार्ग सेवा उपलब्ध नहीं है, इसलिए यह सड़क की दूरी नहीं है और समय केवल मोटे अनुमान हैं।',
  '{from} to {to}: {km} km, {time}, suggested {price} a seat': '{from} से {to}: {km} किमी, {time}, सुझाई गई कीमत {price} प्रति सीट',
  'The suggestion is distance times a flat rate. The price is yours to set.':
    'यह सुझाव दूरी को एक तय दर से गुणा करके निकाला गया है। कीमत तय करना आपके हाथ में है।',
  'You need a vehicle first.': 'पहले आपको एक वाहन चाहिए।',
  'Add one': 'वाहन जोड़ें',
  Vehicle: 'वाहन',
  '{vehicle} ({n} passenger seats)': '{vehicle} ({n} यात्री सीटें)',
  'Leaving at': 'निकलने का समय',
  "In your device's local time.": 'आपके डिवाइस के स्थानीय समय में।',
  'Seats offered': 'दी जाने वाली सीटें',
  'Confirm bookings instantly, without asking me': 'मुझसे पूछे बिना बुकिंग तुरंत पक्की करें',
  'Stops and price per seat': 'पड़ाव और प्रति सीट कीमत',
  'Passengers can book between any two of your stops. Each price is for the stretch that ends at that stop.':
    'यात्री आपके किन्हीं भी दो पड़ावों के बीच बुकिंग कर सकते हैं। हर कीमत उस हिस्से की है जो उस पड़ाव पर खत्म होता है।',
  'Minutes from Kolhapur to {town}': 'कोल्हापुर से {town} तक मिनट',
  'Price to {town} (₹)': '{town} तक की कीमत (₹)',
  'Publishing…': 'प्रकाशित किया जा रहा है…',
  'Publish ride': 'सवारी प्रकाशित करें',

  // A driver's rides
  'You have not published a ride yet.': 'आपने अभी तक कोई सवारी प्रकाशित नहीं की है।',
  'Leaves {time}': 'प्रस्थान {time}',
  'Instant booking': 'तुरंत बुकिंग',
  'You approve requests': 'अनुरोध आप स्वीकार करते हैं',
  '{km} km by road, about {time}': 'सड़क से {km} किमी, लगभग {time}',
  'About {km} km in a straight line (road distance unavailable)': 'सीधी रेखा में लगभग {km} किमी (सड़क की दूरी उपलब्ध नहीं)',
  'Start ride': 'सवारी शुरू करें',
  'Cancel ride': 'सवारी रद्द करें',
  'Yes, cancel for everyone': 'हाँ, सबके लिए रद्द करें',
  'Complete ride': 'सवारी पूरी करें',
  'Yes, we have arrived': 'हाँ, हम पहुँच गए हैं',
  '{from} → {to}: {free} of {total} seats free, {price}': '{from} → {to}: {total} में से {free} सीटें खाली, {price}',
  'Hide passengers': 'यात्री छिपाएँ',
  'Show passengers': 'यात्री दिखाएँ',
  'Nobody has booked this ride yet.': 'अभी तक किसी ने यह सवारी बुक नहीं की है।',
  '{from} → {to} · boards {time} · {n} seat · {price}': '{from} → {to} · {time} पर सवार · {n} सीट · {price}',
  '{from} → {to} · boards {time} · {n} seats · {price}': '{from} → {to} · {time} पर सवार · {n} सीटें · {price}',
  Accept: 'स्वीकार करें',
  Decline: 'अस्वीकार करें',
  'Yes, mark as no-show': 'हाँ, अनुपस्थित दर्ज करें',

  // Earnings
  'Trip completed': 'यात्रा पूरी हुई',
  'Passenger did not board': 'यात्री सवार नहीं हुआ',
  'Passenger cancelled late': 'यात्री ने देर से रद्द किया',
  'Nothing has been paid out yet. You are paid the fare when a trip completes.':
    'अभी तक कोई भुगतान नहीं हुआ है। यात्रा पूरी होने पर आपको किराया मिलता है।',
  'Total paid out': 'कुल भुगतान',
  'Payouts, newest first': 'भुगतान, सबसे नए पहले',
  Paid: 'भुगतान की तारीख',
  Why: 'कारण',
  Amount: 'राशि',

  // Notifications
  'Mark all as read': 'सभी को पढ़ा हुआ करें',
  'You have no notifications.': 'आपके पास कोई सूचना नहीं है।',
  'Unread:': 'अपठित:',
  'Mark as read': 'पढ़ा हुआ करें',

  // Search and booking
  'Board here: {stop}': 'यहाँ सवार हों: {stop}',
  'Get off here: {stop}': 'यहाँ उतरें: {stop}',
  'Map of the ride through {stops}': '{stops} से होकर जाने वाली सवारी का नक्शा',
  'Board at {stop}, leaving {time}.': '{stop} पर सवार हों, प्रस्थान {time}।',
  'The whole ride is {km} km by road.': 'पूरी सवारी सड़क से {km} किमी की है।',
  'The whole ride is about {km} km in a straight line; the road distance is not available.':
    'पूरी सवारी सीधी रेखा में लगभग {km} किमी की है; सड़क की दूरी उपलब्ध नहीं है।',
  'Your start': 'आपका शुरुआती स्थान',
  'Your destination': 'आपका गंतव्य',
  'Start: the centre of {town}': 'शुरुआत: {town} का केंद्र',
  'Destination: the centre of {town}': 'गंतव्य: {town} का केंद्र',
  'Start: a point you chose ({lat}, {lon})': 'शुरुआत: आपका चुना हुआ स्थान ({lat}, {lon})',
  'Destination: a point you chose ({lat}, {lon})': 'गंतव्य: आपका चुना हुआ स्थान ({lat}, {lon})',
  'Use the centre of {town} instead': 'इसके बजाय {town} का केंद्र लें',
  From: 'कहाँ से',
  To: 'कहाँ तक',
  Date: 'तारीख',
  'Rides are matched to the centre of each town unless you choose an exact point. Only rides with a stop near each end are shown.':
    'जब तक आप कोई सटीक स्थान नहीं चुनते, सवारियाँ हर शहर के केंद्र के अनुसार मिलाई जाती हैं। केवल वे सवारियाँ दिखाई जाती हैं जिनका पड़ाव दोनों सिरों के पास हो।',
  'Hide the map': 'नक्शा छिपाएँ',
  'Choose exact points on a map': 'नक्शे पर सटीक स्थान चुनें',
  'Which point a click on the map sets': 'नक्शे पर क्लिक करने से कौन-सा स्थान तय होगा',
  'A click sets my start': 'क्लिक से मेरा शुरुआती स्थान तय हो',
  'A click sets my destination': 'क्लिक से मेरा गंतव्य तय हो',
  'Map of the towns between Kolhapur and Pune. Click to choose an exact point.':
    'कोल्हापुर और पुणे के बीच के शहरों का नक्शा। सटीक स्थान चुनने के लिए क्लिक करें।',
  'Booked. {from} to {to}, leaving {time}.': 'बुक हो गई। {from} से {to}, प्रस्थान {time}।',
  'Request sent. Your seats are held while the driver decides; see My bookings.':
    'अनुरोध भेज दिया गया। चालक के निर्णय तक आपकी सीटें रोककर रखी गई हैं; "मेरी बुकिंग" देखें।',
  '{amount} is held (simulated payment).': '{amount} रोककर रखे गए हैं (अनुकरण भुगतान)।',
  'Search results': 'खोज के परिणाम',
  'No rides have a stop near both ends on that day with that many seats. Try another date or other points.':
    'उस दिन, उतनी सीटों के साथ, ऐसी कोई सवारी नहीं है जिसका पड़ाव दोनों सिरों के पास हो। कोई दूसरी तारीख या दूसरे स्थान आज़माएँ।',
  'Sort by': 'क्रम',
  'Earliest departure': 'सबसे पहले प्रस्थान',
  'Lowest price': 'सबसे कम कीमत',
  'Best-rated driver': 'सबसे अच्छी रेटिंग वाला चालक',
  'Nearest pickup': 'सबसे पास का पिकअप',
  'Pay with': 'भुगतान का तरीका',
  'The amount is held when you book and settled when the trip ends.':
    'बुकिंग के समय राशि रोक ली जाती है और यात्रा समाप्त होने पर उसका निपटान होता है।',
  UPI: 'UPI',
  Card: 'कार्ड',
  Wallet: 'वॉलेट',
  '{n} seat left': '{n} सीट बची है',
  '{n} seats left': '{n} सीटें बची हैं',
  'Confirms instantly': 'तुरंत पक्की होती है',
  'Driver approves each request': 'चालक हर अनुरोध को स्वीकार करता है',
  'Pickup {pickup} from your start · drop-off {dropoff} from your destination':
    'पिकअप आपके शुरुआती स्थान से {pickup} दूर · ड्रॉप आपके गंतव्य से {dropoff} दूर',
  '{fare} fare + {fee} service fee': '{fare} किराया + {fee} सेवा शुल्क',
  Book: 'बुक करें',
  Request: 'अनुरोध करें',
  'Hide route': 'मार्ग छिपाएँ',
  'Show route': 'मार्ग दिखाएँ',
  'You have no bookings yet.': 'आपकी अभी तक कोई बुकिंग नहीं है।',
  'Leaves {time} · {n} seat': 'प्रस्थान {time} · {n} सीट',
  'Leaves {time} · {n} seats': 'प्रस्थान {time} · {n} सीटें',
  'Fare {amount}': 'किराया {amount}',
  '{total} ({fare} fare + {fee} service fee)': '{total} ({fare} किराया + {fee} सेवा शुल्क)',
  '{amount} returned': '{amount} वापस किए गए',
  'Hide meeting point': 'मिलने का स्थान छिपाएँ',
  'Show meeting point': 'मिलने का स्थान दिखाएँ',
  'Cancel booking': 'बुकिंग रद्द करें',
  'Yes, cancel it': 'हाँ, रद्द करें',

  // Profile
  Member: 'सदस्य',
  'Driver since': 'चालक, इस समय से',
  'Passenger since': 'यात्री, इस समय से',
  'Completed trips': 'पूरी की गई यात्राएँ',
  Rating: 'रेटिंग',
  Reviews: 'समीक्षाएँ',
  'Nobody has written a review yet.': 'अभी तक किसी ने समीक्षा नहीं लिखी है।',
  '{stars} out of 5 · {reviewer} · {date}': '5 में से {stars} · {reviewer} · {date}',

  // Chat and live position
  'That message cannot be sent. Check it is not empty or too long.':
    'यह संदेश नहीं भेजा जा सकता। जाँचें कि यह खाली या बहुत लंबा न हो।',
  'The connection was lost. Close the chat and open it again.':
    'संपर्क टूट गया। चैट बंद करके फिर से खोलें।',
  'You are no longer on this ride.':
    'अब आप इस सवारी में शामिल नहीं हैं।',
  'You are sending messages too quickly. Wait a moment.':
    'आप बहुत तेज़ी से संदेश भेज रहे हैं। थोड़ी देर रुकें।',
  'Only the driver can share a position.':
    'केवल चालक ही अपना स्थान साझा कर सकता है।',
  'A position can only be shared while the ride is under way.':
    'स्थान केवल तभी साझा किया जा सकता है जब सवारी चल रही हो।',
  'That could not be sent. Try again.':
    'यह नहीं भेजा जा सका। फिर से कोशिश करें।',
  'The chat service cannot be reached. Try again.':
    'चैट सेवा से संपर्क नहीं हो पा रहा है। फिर से कोशिश करें।',
  'This device cannot report its position.':
    'यह डिवाइस अपना स्थान नहीं बता सकता।',
  'Your position is not available. Check that location access is allowed.':
    'आपका स्थान उपलब्ध नहीं है। जाँचें कि स्थान की अनुमति दी गई है।',
  'Stop sharing my position':
    'मेरा स्थान साझा करना बंद करें',
  'Share my position with passengers':
    'यात्रियों के साथ मेरा स्थान साझा करें',
  'Passengers on this ride can see where you are until you stop or the ride ends.':
    'जब तक आप बंद नहीं करते या सवारी समाप्त नहीं होती, इस सवारी के यात्री देख सकते हैं कि आप कहाँ हैं।',
  'Connecting…':
    'जुड़ रहा है…',
  'The chat is only for the driver and passengers booked on this ride.':
    'चैट केवल चालक और इस सवारी में बुकिंग वाले यात्रियों के लिए है।',
  "The driver's position at {time}":
    '{time} पर चालक का स्थान',
  'The driver':
    'चालक',
  "Map showing the driver's last known position":
    'चालक का अंतिम ज्ञात स्थान दिखाने वाला नक्शा',
  'Messages':
    'संदेश',
  'No messages yet.':
    'अभी कोई संदेश नहीं है।',
  'You':
    'आप',
  'Message everyone on this ride':
    'इस सवारी के सभी लोगों को संदेश भेजें',
  'Send':
    'भेजें',
  'Open chat':
    'चैट खोलें',
  'Close chat':
    'चैट बंद करें',
};
