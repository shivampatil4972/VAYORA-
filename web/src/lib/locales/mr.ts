// Marathi. Keys are the English strings in the source; placeholders in {braces} must be
// kept exactly. Written without review by a native speaker: the wording on money,
// refunds and safety in particular should be checked before anyone relies on it.

export const mr: Record<string, string> = {
  // Navigation and shell
  'Page not found': 'पान सापडले नाही',
  'There is nothing at this address.': 'या पत्त्यावर काहीही नाही.',
  'Find a ride': 'प्रवास शोधा',
  'My bookings': 'माझी बुकिंग',
  'My rides': 'माझे प्रवास',
  'Publish a ride': 'प्रवास प्रकाशित करा',
  'My vehicles': 'माझी वाहने',
  Earnings: 'कमाई',
  Overview: 'आढावा',
  Reports: 'तक्रारी',
  Members: 'सदस्य',
  'Booking durability': 'बुकिंगची स्थिरता',
  'Audit log': 'ऑडिट नोंदी',
  Notifications: 'सूचना',
  unread: 'न वाचलेल्या',
  Language: 'भाषा',
  'Skip to content': 'थेट मजकुराकडे जा',
  Main: 'मुख्य',
  'Sign out': 'साइन आउट',
  'Keep it': 'राहू द्या',
  'Loading…': 'लोड होत आहे…',
  'Try again': 'पुन्हा प्रयत्न करा',

  // Payments and refunds
  'Payments here are simulated. No card, UPI or wallet is contacted and no money is taken or paid out.':
    'येथील पेमेंट केवळ नमुना (सिम्युलेशन) आहे. कोणत्याही कार्ड, UPI किंवा वॉलेटशी संपर्क केला जात नाही आणि कोणतेही पैसे घेतले किंवा दिले जात नाहीत.',
  'If you cancel': 'तुम्ही रद्द केल्यास',
  'Before the driver accepts: everything back, including the service fee.':
    'चालकाने स्वीकारण्यापूर्वी: सेवा शुल्कासह संपूर्ण रक्कम परत.',
  '{hours} hours or more before boarding': 'बसण्याच्या {hours} तास किंवा त्याहून आधी',
  '{from} to {to} hours before boarding': 'बसण्याच्या {from} ते {to} तास आधी',
  '{when}: the whole fare back.': '{when}: संपूर्ण भाडे परत.',
  '{when}: {share} of the fare back.': '{when}: भाड्याच्या {share} रक्कम परत.',
  'Less than {hours} hours before boarding: nothing back.': 'बसण्याच्या {hours} तासांपेक्षा कमी आधी: काहीही परत नाही.',
  'Once the driver has accepted, the service fee is not returned.': 'चालकाने स्वीकारल्यानंतर सेवा शुल्क परत केले जात नाही.',
  'If the driver cancels or declines: everything back.': 'चालकाने रद्द केल्यास किंवा नाकारल्यास: संपूर्ण रक्कम परत.',

  // Ratings
  'No ratings yet': 'अद्याप रेटिंग नाही',
  '{average} out of 5 · {count} rating': '5 पैकी {average} · {count} रेटिंग',
  '{average} out of 5 · {count} ratings': '5 पैकी {average} · {count} रेटिंग',
  '{n} star': '{n} स्टार',
  '{n} stars': '{n} स्टार',
  'Comment (optional, shown on their profile)': 'टिप्पणी (ऐच्छिक, त्यांच्या प्रोफाइलवर दिसेल)',
  'Sending…': 'पाठवत आहे…',
  'Send rating': 'रेटिंग पाठवा',
  'Rate your driver': 'तुमच्या चालकाला रेटिंग द्या',
  'Rate {name}': '{name} यांना रेटिंग द्या',

  // Reports
  'Unsafe driving': 'असुरक्षित ड्रायव्हिंग',
  Harassment: 'छळ',
  'Did not turn up': 'आले नाहीत',
  Fraud: 'फसवणूक',
  'Something else': 'इतर काही',
  'Your report has been sent to the administrators. They will not tell {name} who filed it.':
    'तुमची तक्रार प्रशासकांकडे पाठवली आहे. तक्रार कोणी केली हे ते {name} यांना सांगणार नाहीत.',
  'Report {name}': '{name} यांची तक्रार करा',
  'What happened?': 'काय झाले?',
  'Choose one': 'एक निवडा',
  'Details (optional)': 'तपशील (ऐच्छिक)',
  'If you are in danger now, call 112. A report here is read by an administrator later, not straight away.':
    'तुम्ही आत्ता धोक्यात असाल तर 112 वर कॉल करा. येथे केलेली तक्रार प्रशासक नंतर वाचतात, लगेच नाही.',
  'Send report': 'तक्रार पाठवा',
  'Never mind': 'राहू द्या',

  // Statuses
  'Waiting for the driver': 'चालकाच्या उत्तराची प्रतीक्षा',
  Confirmed: 'निश्चित झाली',
  'Declined by the driver': 'चालकाने नाकारली',
  Cancelled: 'रद्द',
  Completed: 'पूर्ण झाली',
  'Did not board': 'बसले नाहीत',
  Scheduled: 'नियोजित',
  'On the road': 'प्रवासात',

  // Places and units
  Kolhapur: 'कोल्हापूर',
  Karad: 'कराड',
  Satara: 'सातारा',
  Pune: 'पुणे',
  '{n} m': '{n} मी',
  '{n} km': '{n} किमी',
  '{m} min': '{m} मिनिटे',
  '{h} h': '{h} तास',
  '{h} h {m} min': '{h} तास {m} मिनिटे',

  // Validation
  'Enter your email': 'तुमचा ईमेल टाका',
  'Enter a valid email': 'वैध ईमेल टाका',
  'Enter your password': 'तुमचा पासवर्ड टाका',
  'Enter your name': 'तुमचे नाव टाका',
  'Use at least 8 characters': 'किमान 8 अक्षरे वापरा',
  'Use at most 72 characters': 'जास्तीत जास्त 72 अक्षरे वापरा',
  'Choose how you will use JOURNEX': 'तुम्ही JOURNEX कसे वापरणार ते निवडा',
  'Choose where you start': 'तुम्ही कुठून निघणार ते निवडा',
  'Choose where you are going': 'तुम्ही कुठे जाणार ते निवडा',
  'Choose a date': 'तारीख निवडा',
  'At least 1 seat': 'किमान 1 जागा',
  'At most 8 seats': 'जास्तीत जास्त 8 जागा',
  'The destination must come after the starting point on the way to Pune':
    'पुण्याकडे जाताना गंतव्यस्थान सुरुवातीच्या ठिकाणानंतर यायला हवे',
  'Enter the make': 'कंपनीचे नाव टाका',
  'Enter the model': 'मॉडेल टाका',
  'Too old': 'खूप जुने',
  'Check the year': 'वर्ष तपासा',
  'At least 2, counting the driver': 'चालकासह किमान 2',
  'At most 9': 'जास्तीत जास्त 9',
  'Choose a vehicle': 'वाहन निवडा',
  'Choose when you leave': 'तुम्ही केव्हा निघणार ते निवडा',
  'Offer at least 1 seat': 'किमान 1 जागा द्या',
  'Choose a time in the future': 'पुढील वेळ निवडा',
  'A ride needs at least two stops': 'प्रवासात किमान दोन थांबे हवेत',
  'Enter whole minutes, up to two days': 'पूर्ण मिनिटे टाका, जास्तीत जास्त दोन दिवस',
  'Enter a price of 0 or more': '0 किंवा त्याहून जास्त किंमत टाका',
  'Must be later than the stop before': 'आधीच्या थांब्यानंतरचे असायला हवे',

  // Booking durability (administrator)
  "Each figure is a model's estimate that the passenger will not cancel before departure. The model was trained on simulated data only and separates risky from safe bookings weakly. It is not a fact about any person and must not be used to decline, penalise or price anyone.":
    'प्रत्येक आकडा म्हणजे प्रवासी निघण्यापूर्वी बुकिंग रद्द करणार नाही याचा मॉडेलने केलेला अंदाज आहे. मॉडेल केवळ कृत्रिम (सिम्युलेटेड) डेटावर प्रशिक्षित केले आहे आणि ते जोखमीच्या व सुरक्षित बुकिंगमध्ये फारसा फरक करू शकत नाही. हे कोणत्याही व्यक्तीबद्दलचे तथ्य नाही आणि कोणालाही नाकारण्यासाठी, दंड करण्यासाठी किंवा किंमत ठरवण्यासाठी याचा वापर करू नये.',
  'Scoring…': 'अंदाज काढत आहे…',
  'Score bookings now': 'आत्ता बुकिंगचा अंदाज काढा',
  'Another scoring run is in progress.': 'अंदाज काढण्याची दुसरी प्रक्रिया आधीच सुरू आहे.',
  '{scored} scored, {already} already scored today, {failed} could not be scored.':
    '{scored} चा अंदाज काढला, {already} चा आज आधीच काढला होता, {failed} चा काढता आला नाही.',
  'The model service did not answer for some bookings. They are unchanged; run it again later.':
    'काही बुकिंगसाठी मॉडेल सेवेने उत्तर दिले नाही. त्या जशाच्या तशा आहेत; नंतर पुन्हा चालवा.',
  'No confirmed booking has been scored yet.': 'अद्याप कोणत्याही निश्चित बुकिंगचा अंदाज काढलेला नाही.',
  'Latest durability estimate of each confirmed booking': 'प्रत्येक निश्चित बुकिंगचा सर्वात अलीकडील स्थिरता अंदाज',
  Booking: 'बुकिंग',
  Passenger: 'प्रवासी',
  Trip: 'प्रवास',
  Leaves: 'निघण्याची वेळ',
  Estimate: 'अंदाज',
  Model: 'मॉडेल',
  Scored: 'अंदाजाची वेळ',

  // Signing in
  'Sign in': 'साइन इन करा',
  Email: 'ईमेल',
  Password: 'पासवर्ड',
  'Signing in…': 'साइन इन होत आहे…',
  'New here?': 'पहिल्यांदाच आला आहात?',
  'Create an account': 'खाते तयार करा',
  'Full name': 'पूर्ण नाव',
  'At least 8 characters.': 'किमान 8 अक्षरे.',
  'I want to': 'मला हे करायचे आहे',
  'An account is either a passenger or a driver. This cannot be changed later.':
    'खाते एकतर प्रवाशाचे असते किंवा चालकाचे. हे नंतर बदलता येत नाही.',
  'Find rides as a passenger': 'प्रवासी म्हणून प्रवास शोधणे',
  'Offer rides as a driver': 'चालक म्हणून प्रवास देणे',
  'Creating…': 'तयार करत आहे…',
  'Create account': 'खाते तयार करा',
  'Already have an account?': 'आधीच खाते आहे?',

  // Back office
  Passengers: 'प्रवासी',
  Drivers: 'चालक',
  Administrators: 'प्रशासक',
  Driver: 'चालक',
  Administrator: 'प्रशासक',
  'None yet.': 'अद्याप काही नाही.',
  '{n} report is waiting.': '{n} तक्रार प्रलंबित आहे.',
  '{n} reports are waiting.': '{n} तक्रारी प्रलंबित आहेत.',
  'Open the queue': 'यादी उघडा',
  'Members by role': 'भूमिकेनुसार सदस्य',
  'Rides by status': 'स्थितीनुसार प्रवास',
  'Bookings by status': 'स्थितीनुसार बुकिंग',
  'Suspended members: {n}': 'निलंबित सदस्य: {n}',
  'No reports are waiting.': 'कोणतीही तक्रार प्रलंबित नाही.',
  '{reason}: {reporter} about': '{reason}: {reporter} यांनी तक्रार केली, यांच्याबद्दल:',
  'Filed {time}': '{time} रोजी नोंदवली',
  'booking #{id}': 'बुकिंग #{id}',
  'Note for report #{id}': 'तक्रार #{id} साठी टीप',
  'Kept with the report. Sent to the member if you warn them.':
    'तक्रारीसोबत ठेवली जाते. तुम्ही सदस्याला ताकीद दिल्यास त्यांना पाठवली जाते.',
  Dismiss: 'फेटाळा',
  'Warn member': 'सदस्याला ताकीद द्या',
  'Suspend member': 'सदस्याला निलंबित करा',
  'Yes, suspend {name}': 'होय, {name} यांना निलंबित करा',
  'Name or email': 'नाव किंवा ईमेल',
  Search: 'शोधा',
  'No member matches.': 'एकही सदस्य सापडला नाही.',
  'Members, newest first': 'सदस्य, सर्वात नवीन आधी',
  Name: 'नाव',
  Role: 'भूमिका',
  Joined: 'सामील झाले',
  Standing: 'स्थिती',
  Suspended: 'निलंबित',
  'Reinstate {name}': '{name} यांना पुन्हा सक्रिय करा',
  Active: 'सक्रिय',
  'Every administrative action, newest first. Entries cannot be edited or removed.':
    'प्रत्येक प्रशासकीय कृती, सर्वात नवीन आधी. नोंदी बदलता किंवा काढता येत नाहीत.',
  'No administrative action has been recorded.': 'कोणतीही प्रशासकीय कृती नोंदवलेली नाही.',
  'Administrative actions': 'प्रशासकीय कृती',
  When: 'केव्हा',
  Who: 'कोणी',
  Action: 'कृती',
  On: 'कशावर',
  Detail: 'तपशील',

  // Vehicles
  'Add a vehicle before you publish a ride.': 'प्रवास प्रकाशित करण्यापूर्वी एक वाहन जोडा.',
  '{n} seats including yours': 'तुमच्या जागेसह {n} जागा',
  'Add a vehicle': 'वाहन जोडा',
  Make: 'कंपनी',
  'Year (optional)': 'वर्ष (ऐच्छिक)',
  'Colour (optional)': 'रंग (ऐच्छिक)',
  Seats: 'जागा',
  "Every seat in the vehicle, counting the driver's.": 'वाहनातील प्रत्येक जागा, चालकाच्या जागेसह.',
  'Adding…': 'जोडत आहे…',
  'Add vehicle': 'वाहन जोडा',

  // Publishing a ride
  'Route and meeting points': 'मार्ग आणि भेटण्याची ठिकाणे',
  'A click on the map moves the meeting point for': 'नकाशावर क्लिक केल्यास याचे भेटण्याचे ठिकाण बदलेल',
  'Each starts at the town centre. Put it where passengers should actually find you.':
    'प्रत्येक ठिकाण सुरुवातीला शहराच्या मध्यभागी असते. प्रवाशांनी तुम्हाला प्रत्यक्षात जिथे भेटावे तिथे ते ठेवा.',
  '{town} meeting point': '{town} येथील भेटण्याचे ठिकाण',
  'Map of your stops: {stops}': 'तुमच्या थांब्यांचा नकाशा: {stops}',
  'Working out the route…': 'मार्ग काढत आहे…',
  'Work out the route': 'मार्ग काढा',
  'Use the suggested prices and times': 'सुचवलेल्या किमती आणि वेळा वापरा',
  '{km} km by road, about {time} of driving.': 'रस्त्याने {km} किमी, सुमारे {time} ड्रायव्हिंग.',
  'About {km} km in a straight line. The routing service is unavailable, so this is not a road distance and the times are rough guesses.':
    'सरळ रेषेत सुमारे {km} किमी. मार्ग सेवा उपलब्ध नाही, त्यामुळे हे रस्त्याचे अंतर नाही आणि वेळा केवळ ढोबळ अंदाज आहेत.',
  '{from} to {to}: {km} km, {time}, suggested {price} a seat': '{from} ते {to}: {km} किमी, {time}, सुचवलेली किंमत प्रति जागा {price}',
  'The suggestion is distance times a flat rate. The price is yours to set.':
    'ही सूचना अंतराला एका ठरावीक दराने गुणून काढली आहे. किंमत ठरवणे तुमच्या हातात आहे.',
  'You need a vehicle first.': 'आधी तुम्हाला एक वाहन हवे.',
  'Add one': 'वाहन जोडा',
  Vehicle: 'वाहन',
  '{vehicle} ({n} passenger seats)': '{vehicle} ({n} प्रवासी जागा)',
  'Leaving at': 'निघण्याची वेळ',
  "In your device's local time.": 'तुमच्या डिव्हाइसच्या स्थानिक वेळेनुसार.',
  'Seats offered': 'देऊ केलेल्या जागा',
  'Confirm bookings instantly, without asking me': 'मला न विचारता बुकिंग लगेच निश्चित करा',
  'Stops and price per seat': 'थांबे आणि प्रति जागा किंमत',
  'Passengers can book between any two of your stops. Each price is for the stretch that ends at that stop.':
    'प्रवासी तुमच्या कोणत्याही दोन थांब्यांदरम्यान बुकिंग करू शकतात. प्रत्येक किंमत त्या थांब्यावर संपणाऱ्या टप्प्याची आहे.',
  'Minutes from Kolhapur to {town}': 'कोल्हापूरपासून {town} पर्यंत मिनिटे',
  'Price to {town} (₹)': '{town} पर्यंतची किंमत (₹)',
  'Publishing…': 'प्रकाशित करत आहे…',
  'Publish ride': 'प्रवास प्रकाशित करा',

  // A driver's rides
  'You have not published a ride yet.': 'तुम्ही अद्याप एकही प्रवास प्रकाशित केलेला नाही.',
  'Leaves {time}': 'निघण्याची वेळ {time}',
  'Instant booking': 'त्वरित बुकिंग',
  'You approve requests': 'विनंत्या तुम्ही मंजूर करता',
  '{km} km by road, about {time}': 'रस्त्याने {km} किमी, सुमारे {time}',
  'About {km} km in a straight line (road distance unavailable)': 'सरळ रेषेत सुमारे {km} किमी (रस्त्याचे अंतर उपलब्ध नाही)',
  'Start ride': 'प्रवास सुरू करा',
  'Cancel ride': 'प्रवास रद्द करा',
  'Yes, cancel for everyone': 'होय, सर्वांसाठी रद्द करा',
  'Complete ride': 'प्रवास पूर्ण करा',
  'Yes, we have arrived': 'होय, आम्ही पोहोचलो आहोत',
  '{from} → {to}: {free} of {total} seats free, {price}': '{from} → {to}: {total} पैकी {free} जागा रिकाम्या, {price}',
  'Hide passengers': 'प्रवासी लपवा',
  'Show passengers': 'प्रवासी दाखवा',
  'Nobody has booked this ride yet.': 'अद्याप कोणीही हा प्रवास बुक केलेला नाही.',
  '{from} → {to} · boards {time} · {n} seat · {price}': '{from} → {to} · {time} ला बसणार · {n} जागा · {price}',
  '{from} → {to} · boards {time} · {n} seats · {price}': '{from} → {to} · {time} ला बसणार · {n} जागा · {price}',
  Accept: 'स्वीकारा',
  Decline: 'नाकारा',
  'Yes, mark as no-show': 'होय, गैरहजर म्हणून नोंदवा',

  // Earnings
  'Trip completed': 'प्रवास पूर्ण झाला',
  'Passenger did not board': 'प्रवासी बसला नाही',
  'Passenger cancelled late': 'प्रवाशाने उशिरा रद्द केले',
  'Nothing has been paid out yet. You are paid the fare when a trip completes.':
    'अद्याप कोणतीही रक्कम दिलेली नाही. प्रवास पूर्ण झाल्यावर तुम्हाला भाडे मिळते.',
  'Total paid out': 'एकूण दिलेली रक्कम',
  'Payouts, newest first': 'दिलेल्या रकमा, सर्वात नवीन आधी',
  Paid: 'रक्कम दिल्याची तारीख',
  Why: 'कारण',
  Amount: 'रक्कम',

  // Notifications
  'Mark all as read': 'सर्व वाचलेल्या म्हणून नोंदवा',
  'You have no notifications.': 'तुमच्यासाठी कोणतीही सूचना नाही.',
  'Unread:': 'न वाचलेली:',
  'Mark as read': 'वाचलेली म्हणून नोंदवा',

  // Search and booking
  'Board here: {stop}': 'येथे बसा: {stop}',
  'Get off here: {stop}': 'येथे उतरा: {stop}',
  'Map of the ride through {stops}': '{stops} मार्गे जाणाऱ्या प्रवासाचा नकाशा',
  'Board at {stop}, leaving {time}.': '{stop} येथे बसा, निघण्याची वेळ {time}.',
  'The whole ride is {km} km by road.': 'संपूर्ण प्रवास रस्त्याने {km} किमी आहे.',
  'The whole ride is about {km} km in a straight line; the road distance is not available.':
    'संपूर्ण प्रवास सरळ रेषेत सुमारे {km} किमी आहे; रस्त्याचे अंतर उपलब्ध नाही.',
  'Your start': 'तुमचे सुरुवातीचे ठिकाण',
  'Your destination': 'तुमचे गंतव्यस्थान',
  'Start: the centre of {town}': 'सुरुवात: {town} चा मध्यभाग',
  'Destination: the centre of {town}': 'गंतव्यस्थान: {town} चा मध्यभाग',
  'Start: a point you chose ({lat}, {lon})': 'सुरुवात: तुम्ही निवडलेले ठिकाण ({lat}, {lon})',
  'Destination: a point you chose ({lat}, {lon})': 'गंतव्यस्थान: तुम्ही निवडलेले ठिकाण ({lat}, {lon})',
  'Use the centre of {town} instead': 'त्याऐवजी {town} चा मध्यभाग वापरा',
  From: 'कुठून',
  To: 'कुठे',
  Date: 'तारीख',
  'Rides are matched to the centre of each town unless you choose an exact point. Only rides with a stop near each end are shown.':
    'तुम्ही अचूक ठिकाण निवडले नाही तर प्रवास प्रत्येक शहराच्या मध्यभागानुसार जुळवले जातात. दोन्ही टोकांजवळ थांबा असलेलेच प्रवास दाखवले जातात.',
  'Hide the map': 'नकाशा लपवा',
  'Choose exact points on a map': 'नकाशावर अचूक ठिकाणे निवडा',
  'Which point a click on the map sets': 'नकाशावर क्लिक केल्यास कोणते ठिकाण ठरेल',
  'A click sets my start': 'क्लिकने माझे सुरुवातीचे ठिकाण ठरवा',
  'A click sets my destination': 'क्लिकने माझे गंतव्यस्थान ठरवा',
  'Map of the towns between Kolhapur and Pune. Click to choose an exact point.':
    'कोल्हापूर आणि पुणे दरम्यानच्या शहरांचा नकाशा. अचूक ठिकाण निवडण्यासाठी क्लिक करा.',
  'Booked. {from} to {to}, leaving {time}.': 'बुक झाले. {from} ते {to}, निघण्याची वेळ {time}.',
  'Request sent. Your seats are held while the driver decides; see My bookings.':
    'विनंती पाठवली. चालक निर्णय घेईपर्यंत तुमच्या जागा राखून ठेवल्या आहेत; "माझी बुकिंग" पहा.',
  '{amount} is held (simulated payment).': '{amount} राखून ठेवले आहेत (नमुना पेमेंट).',
  'Search results': 'शोधाचे निकाल',
  'No rides have a stop near both ends on that day with that many seats. Try another date or other points.':
    'त्या दिवशी, तितक्या जागांसह, दोन्ही टोकांजवळ थांबा असलेला एकही प्रवास नाही. दुसरी तारीख किंवा दुसरी ठिकाणे वापरून पहा.',
  'Sort by': 'क्रम',
  'Earliest departure': 'सर्वात आधी निघणारा',
  'Lowest price': 'सर्वात कमी किंमत',
  'Best-rated driver': 'सर्वोत्तम रेटिंग असलेला चालक',
  'Nearest pickup': 'सर्वात जवळचे पिकअप',
  'Pay with': 'पेमेंटचा प्रकार',
  'The amount is held when you book and settled when the trip ends.':
    'बुकिंग करताना रक्कम राखून ठेवली जाते आणि प्रवास संपल्यावर तिचा हिशोब केला जातो.',
  UPI: 'UPI',
  Card: 'कार्ड',
  Wallet: 'वॉलेट',
  '{n} seat left': '{n} जागा शिल्लक',
  '{n} seats left': '{n} जागा शिल्लक',
  'Confirms instantly': 'लगेच निश्चित होते',
  'Driver approves each request': 'चालक प्रत्येक विनंती मंजूर करतो',
  'Pickup {pickup} from your start · drop-off {dropoff} from your destination':
    'पिकअप तुमच्या सुरुवातीच्या ठिकाणापासून {pickup} · ड्रॉप तुमच्या गंतव्यस्थानापासून {dropoff}',
  '{fare} fare + {fee} service fee': '{fare} भाडे + {fee} सेवा शुल्क',
  Book: 'बुक करा',
  Request: 'विनंती करा',
  'Hide route': 'मार्ग लपवा',
  'Show route': 'मार्ग दाखवा',
  'You have no bookings yet.': 'तुमची अद्याप एकही बुकिंग नाही.',
  'Leaves {time} · {n} seat': 'निघण्याची वेळ {time} · {n} जागा',
  'Leaves {time} · {n} seats': 'निघण्याची वेळ {time} · {n} जागा',
  'Fare {amount}': 'भाडे {amount}',
  '{total} ({fare} fare + {fee} service fee)': '{total} ({fare} भाडे + {fee} सेवा शुल्क)',
  '{amount} returned': '{amount} परत केले',
  'Hide meeting point': 'भेटण्याचे ठिकाण लपवा',
  'Show meeting point': 'भेटण्याचे ठिकाण दाखवा',
  'Cancel booking': 'बुकिंग रद्द करा',
  'Yes, cancel it': 'होय, रद्द करा',

  // Profile
  Member: 'सदस्य',
  'Driver since': 'चालक, या वेळेपासून',
  'Passenger since': 'प्रवासी, या वेळेपासून',
  'Completed trips': 'पूर्ण केलेले प्रवास',
  Rating: 'रेटिंग',
  Reviews: 'अभिप्राय',
  'Nobody has written a review yet.': 'अद्याप कोणीही अभिप्राय लिहिलेला नाही.',
  '{stars} out of 5 · {reviewer} · {date}': '5 पैकी {stars} · {reviewer} · {date}',

  // Chat and live position
  'That message cannot be sent. Check it is not empty or too long.':
    'हा संदेश पाठवता येत नाही. तो रिकामा किंवा खूप मोठा नाही ना ते तपासा.',
  'The connection was lost. Close the chat and open it again.':
    'संपर्क तुटला. चॅट बंद करून पुन्हा उघडा.',
  'You are no longer on this ride.':
    'तुम्ही आता या प्रवासात नाही.',
  'You are sending messages too quickly. Wait a moment.':
    'तुम्ही खूप वेगाने संदेश पाठवत आहात. थोडा वेळ थांबा.',
  'Only the driver can share a position.':
    'फक्त चालकच आपले स्थान शेअर करू शकतो.',
  'A position can only be shared while the ride is under way.':
    'प्रवास सुरू असतानाच स्थान शेअर करता येते.',
  'That could not be sent. Try again.':
    'ते पाठवता आले नाही. पुन्हा प्रयत्न करा.',
  'The chat service cannot be reached. Try again.':
    'चॅट सेवेशी संपर्क होत नाही. पुन्हा प्रयत्न करा.',
  'This device cannot report its position.':
    'हे डिव्हाइस आपले स्थान सांगू शकत नाही.',
  'Your position is not available. Check that location access is allowed.':
    'तुमचे स्थान उपलब्ध नाही. स्थानाची परवानगी दिली आहे का ते तपासा.',
  'Stop sharing my position':
    'माझे स्थान शेअर करणे थांबवा',
  'Share my position with passengers':
    'प्रवाशांसोबत माझे स्थान शेअर करा',
  'Passengers on this ride can see where you are until you stop or the ride ends.':
    'तुम्ही थांबवेपर्यंत किंवा प्रवास संपेपर्यंत या प्रवासातील प्रवासी तुम्ही कुठे आहात ते पाहू शकतात.',
  'Connecting…':
    'जोडत आहे…',
  'The chat is only for the driver and passengers booked on this ride.':
    'चॅट फक्त चालक आणि या प्रवासाची बुकिंग असलेल्या प्रवाशांसाठी आहे.',
  "The driver's position at {time}":
    '{time} वाजता चालकाचे स्थान',
  'The driver':
    'चालक',
  "Map showing the driver's last known position":
    'चालकाचे शेवटचे माहीत असलेले स्थान दाखवणारा नकाशा',
  'Messages':
    'संदेश',
  'No messages yet.':
    'अद्याप एकही संदेश नाही.',
  'You':
    'तुम्ही',
  'Message everyone on this ride':
    'या प्रवासातील सर्वांना संदेश पाठवा',
  'Send':
    'पाठवा',
  'Open chat':
    'चॅट उघडा',
  'Close chat':
    'चॅट बंद करा',
  // Account, verification and emergencies
  'My account':
    'माझे खाते',
  'Emergency':
    'आणीबाणी',
  'Emergencies':
    'आणीबाणीच्या घटना',
  'If you are in danger, call 112 now.':
    'तुम्ही धोक्यात असाल तर आत्ताच 112 वर कॉल करा.',
  'Call 112':
    '112 वर कॉल करा',
  'You can also alert the JOURNEX administrators. They see it in a queue; they are not an emergency service.':
    'तुम्ही JOURNEX च्या प्रशासकांनाही कळवू शकता. त्यांना ते एका यादीत दिसते; ते आपत्कालीन सेवा नाहीत.',
  'Send an alert':
    'सूचना पाठवा',
  'Close':
    'बंद करा',
  'Your alert is recorded and the administrators can see it.':
    'तुमची सूचना नोंदवली आहे आणि प्रशासक ती पाहू शकतात.',
  'A message was sent to {n} of your emergency contacts.':
    'तुमच्या {n} आपत्कालीन संपर्कांना संदेश पाठवला.',
  'Text messages are simulated in this project: your emergency contacts were NOT messaged. Call them yourself, or call 112.':
    'या प्रकल्पात SMS फक्त सिम्युलेटेड आहेत: तुमच्या आपत्कालीन संपर्कांना संदेश पाठवला गेला नाही. त्यांना स्वतः कॉल करा, किंवा 112 वर कॉल करा.',
  'Prefers a quiet ride':
    'शांत प्रवास आवडतो',
  'Happy with some conversation':
    'थोड्या गप्पा चालतील',
  'Likes to talk':
    'गप्पा मारायला आवडते',
  'Fine with smoking':
    'धूम्रपान चालेल',
  'No smoking':
    'धूम्रपान नको',
  'Fine with pets':
    'पाळीव प्राणी चालतील',
  'No pets':
    'पाळीव प्राणी नकोत',
  'Likes music on the way':
    'प्रवासात संगीत आवडते',
  'Prefers no music':
    'संगीत नको',
  'About this member':
    'या सदस्याविषयी',
  'About {n} years old':
    'सुमारे {n} वर्षे',
  'Email confirmed':
    'ईमेलची खात्री झाली',
  'Phone confirmed':
    'फोनची खात्री झाली',
  'JOURNEX has not checked any identity documents.':
    'JOURNEX ने कोणतीही ओळखपत्रे तपासलेली नाहीत.',
  'Enter 10 to 15 digits, with or without a + in front':
    '10 ते 15 अंक लिहा, सुरुवातीला + असो वा नसो',
  'Not said':
    'सांगितले नाही',
  'Fine with me':
    'मला चालेल',
  'No, please':
    'कृपया नको',
  'Your profile is saved.':
    'तुमची प्रोफाइल जतन झाली.',
  'Phone number':
    'फोन नंबर',
  'Never shown to other members. Changing it means confirming it again.':
    'इतर सदस्यांना कधीही दाखवला जात नाही. तो बदलल्यास पुन्हा खात्री करावी लागेल.',
  'About you':
    'तुमच्याविषयी',
  'Year of birth':
    'जन्म वर्ष',
  'Other members see only your approximate age.':
    'इतर सदस्यांना फक्त तुमचे अंदाजे वय दिसते.',
  'Gender':
    'लिंग',
    'Woman':
    'स्त्री',
  'Man':
    'पुरुष',
  'Other':
    'इतर',
  'Smoking in the car':
    'गाडीत धूम्रपान',
  'Pets in the car':
    'गाडीत पाळीव प्राणी',
  'Music on the way':
    'प्रवासात संगीत',
  'Conversation':
    'गप्पा',
  'I prefer a quiet ride':
    'मला शांत प्रवास आवडतो',
  'Some conversation is nice':
    'थोड्या गप्पा बऱ्या वाटतात',
  'I like to talk':
    'मला गप्पा मारायला आवडते',
  'Saving…':
    'जतन होत आहे…',
  'Save profile':
    'प्रोफाइल जतन करा',
  'None given':
    'दिलेला नाही',
  'Not confirmed':
    'खात्री झालेली नाही',
  'Send me a code':
    'मला कोड पाठवा',
  '6-digit code':
    '6 अंकी कोड',
  'Confirm':
    'खात्री करा',
  'This project sends no real email or SMS. The code was only written to the simulated outbox, which an administrator can read.':
    'हा प्रकल्प खरा ईमेल किंवा SMS पाठवत नाही. कोड फक्त सिम्युलेटेड आउटबॉक्समध्ये लिहिला आहे, जो प्रशासक वाचू शकतो.',
  'The people the emergency button is meant to tell. Text messages are simulated in this project, so today they would NOT be messaged.':
    'आणीबाणीच्या बटणाने ज्यांना कळवायचे ते लोक. या प्रकल्पात SMS सिम्युलेटेड आहेत, त्यामुळे आज त्यांना संदेश जाणार नाही.',
  'You have no emergency contacts yet.':
    'तुमचे अजून कोणतेही आपत्कालीन संपर्क नाहीत.',
  'Remove {name}':
    '{name} यांना काढा',
  'Yes, remove':
    'होय, काढा',
  'You can have at most {n} emergency contacts.':
    'तुम्ही जास्तीत जास्त {n} आपत्कालीन संपर्क ठेवू शकता.',
  'Their name':
    'त्यांचे नाव',
  'Their phone number':
    'त्यांचा फोन नंबर',
  'Who they are to you (optional)':
    'तुमच्याशी त्यांचे नाते (ऐच्छिक)',
  'Add contact':
    'संपर्क जोडा',
  'Profile':
    'प्रोफाइल',
  'Email and phone':
    'ईमेल आणि फोन',
  'Phone':
    'फोन',
  'Emergency contacts':
    'आपत्कालीन संपर्क',
  'Simulated outbox':
    'सिम्युलेटेड आउटबॉक्स',
  'None of these was sent to anyone. The newest 50 are kept in memory and are lost when the server restarts.':
    'यांपैकी काहीही कोणालाही पाठवले गेले नाही. सर्वात नवीन 50 मेमरीत ठेवले जातात आणि सर्व्हर पुन्हा सुरू झाल्यावर नष्ट होतात.',
  'Nothing has been handed to the simulated sender.':
    'सिम्युलेटेड प्रेषकाकडे अजून काहीही दिलेले नाही.',
  'Members who pressed the emergency button, oldest first. Acknowledging one records that you have seen it and are acting on it.':
    'आणीबाणीचे बटण दाबलेले सदस्य, सर्वात जुने आधी. दखल घेतल्यास नोंद होते की तुम्ही ते पाहिले आहे आणि त्यावर कृती करत आहात.',
  'No emergency is waiting.':
    'कोणतीही आणीबाणी प्रलंबित नाही.',
  'Phone: {phone}':
    'फोन: {phone}',
  'No phone number on the account.':
    'खात्यावर फोन नंबर नाही.',
  'Position given: {lat}, {lon}':
    'दिलेले ठिकाण: {lat}, {lon}',
  'No position was given.':
    'ठिकाण दिलेले नाही.',
  'On ride {id}':
    'प्रवास {id} मध्ये',
  '{n} emergency contacts on file. They were NOT messaged: the sender is simulated.':
    '{n} आपत्कालीन संपर्क नोंदलेले आहेत. त्यांना संदेश पाठवला गेला नाही: प्रेषक सिम्युलेटेड आहे.',
  'A message was sent to {n} emergency contacts.':
    '{n} आपत्कालीन संपर्कांना संदेश पाठवला.',
  'Acknowledge':
    'दखल घ्या',
  // Search filters
  'Hide filters':
    'फिल्टर लपवा',
  'Filters':
    'फिल्टर',
  'Show only rides that':
    'फक्त असे प्रवास दाखवा जे',
  'Leave in the':
    'या वेळी निघतात',
  'Any time of day':
    'दिवसात कोणत्याही वेळी',
  'Morning, before 12':
    'सकाळी, 12 च्या आधी',
  'Afternoon, 12 to 5':
    'दुपारी, 12 ते 5',
  'Evening, from 5':
    'संध्याकाळी, 5 पासून',
  'Cost at most, per seat (₹)':
    'प्रति जागा कमाल किंमत (₹)',
  'Confirm instantly':
    'लगेच निश्चित होतात',
  'Have a driver with a confirmed email or phone':
    'ज्यांच्या चालकाचा ईमेल किंवा फोन खात्री केलेला आहे',
  'Have a driver who said no smoking':
    'ज्यांच्या चालकाने धूम्रपान नको सांगितले आहे',
  'Have a driver who said pets are welcome':
    'ज्यांच्या चालकाने पाळीव प्राणी चालतील सांगितले आहे',
  'The last two leave out drivers who have not said either way. Filters apply when you press Search.':
    'शेवटचे दोन फिल्टर काहीच न सांगितलेल्या चालकांना वगळतात. शोधा दाबल्यावर फिल्टर लागू होतात.',
  'No rides match on that day with those filters. Try fewer filters, another date or other points.':
    'त्या दिवशी या फिल्टरसह कोणताही प्रवास मिळाला नाही. कमी फिल्टर, दुसरी तारीख किंवा दुसरी ठिकाणे वापरून पहा.',
  'Contact confirmed':
    'संपर्काची खात्री झाली',
  // Ride notes, return and repeated rides
  'At most 500 characters':
    'जास्तीत जास्त 500 अक्षरे',
  'The return must leave after you have arrived':
    'परतीचा प्रवास तुम्ही पोहोचल्यानंतरच निघू शकतो',
  'I promise at most two passengers on the back seat':
    'मागच्या सीटवर जास्तीत जास्त दोन प्रवासी असतील असे मी वचन देतो/देते',
  'Notes for passengers (optional)':
    'प्रवाशांसाठी सूचना (ऐच्छिक)',
  'Luggage, where exactly you wait, anything they should know.':
    'सामान, तुम्ही नेमके कुठे थांबाल, त्यांना माहीत असावे असे काहीही.',
  'Return ride leaving at (optional)':
    'परतीच्या प्रवासाची वेळ (ऐच्छिक)',
  'The same stops in reverse, with the same prices and the same time between stops.':
    'तेच थांबे उलट क्रमाने, त्याच किमती आणि थांब्यांमधील तोच वेळ.',
  'Repeat every week':
    'दर आठवड्याला पुन्हा',
  'At the same time of day. Each is a separate ride you can withdraw on its own.':
    'दिवसाच्या त्याच वेळी. प्रत्येक स्वतंत्र प्रवास आहे, जो तुम्ही वेगळा मागे घेऊ शकता.',
  'No, just this once':
    'नाही, फक्त या वेळी',
  'For {n} more week':
    'आणखी {n} आठवड्यासाठी',
  'For {n} more weeks':
    'आणखी {n} आठवड्यांसाठी',
  'This will publish {n} rides.':
    'यामुळे {n} प्रवास प्रकाशित होतील.',
  'At most two in the back':
    'मागे जास्तीत जास्त दोन प्रवासी',
  'Promise at most two in the back':
    'मागे जास्तीत जास्त दोन प्रवाशांचे वचन देतात',
  'From the driver:':
    'चालकाकडून:',
  // Vehicle details
  'Basic':
    'साधी',
  'Comfortable':
    'आरामदायी',
  'Premium':
    'प्रीमियम',
  'No luggage':
    'सामान नाही',
  'A small bag each':
    'प्रत्येकी एक छोटी बॅग',
  'A medium bag each':
    'प्रत्येकी एक मध्यम बॅग',
  'A large suitcase each':
    'प्रत्येकी एक मोठी सुटकेस',
  'Electric':
    'इलेक्ट्रिक',
  'Between 1 and 300 kWh':
    '1 ते 300 kWh दरम्यान',
  'Between 5 and 60 kWh per 100 km':
    'दर 100 किमीला 5 ते 60 kWh दरम्यान',
  'About {km} km on a full charge, from the figures you gave. Not a measured range.':
    'तुम्ही दिलेल्या आकड्यांनुसार पूर्ण चार्जवर सुमारे {km} किमी. ही मोजलेली रेंज नाही.',
  'Comfort (optional)':
    'आरामाचा दर्जा (ऐच्छिक)',
  'Your own description. Nobody inspects the car.':
    'हे तुमचे स्वतःचे वर्णन आहे. गाडीची कोणी तपासणी करत नाही.',
  'Luggage per passenger (optional)':
    'प्रति प्रवासी सामान (ऐच्छिक)',
  'This vehicle is electric':
    'हे वाहन इलेक्ट्रिक आहे',
  'Battery (kWh, optional)':
    'बॅटरी (kWh, ऐच्छिक)',
  'Consumption (kWh per 100 km, optional)':
    'वापर (kWh दर 100 किमी, ऐच्छिक)',
  // Seat holds
  'Hold while I decide':
    'ठरवेपर्यंत राखून ठेवा',
  'Held for you until {time}. This is not a booking: book before then or the seats go back.':
    '{time} पर्यंत तुमच्यासाठी राखून ठेवल्या आहेत. हे बुकिंग नाही: त्याआधी बुक करा, नाहीतर जागा परत जातील.',
  // Request expiry
  'The driver has until {time} to answer. After that the request closes and everything you paid is returned.':
    'चालकाकडे उत्तर देण्यासाठी {time} पर्यंत वेळ आहे. त्यानंतर विनंती बंद होईल आणि तुम्ही भरलेली सर्व रक्कम परत केली जाईल.',
  // Passenger payments
  'Payments':
    'देयके',
  'The driver did not accept':
    'चालकाने स्वीकारले नाही',
  'The driver cancelled':
    'चालकाने रद्द केले',
  'You cancelled':
    'तुम्ही रद्द केले',
  'You have not paid for anything yet.':
    'तुम्ही अजून कशाचेही पैसे भरलेले नाहीत.',
  'Paid, less what came back':
    'भरलेली रक्कम, परत आलेली वजा करून',
  'Payments, newest first':
    'देयके, सर्वात नवीन आधी',
  'Booked':
    'बुकिंगची वेळ',
  'Paid with':
    'भरण्याची पद्धत',
  'Came back':
    'परत मिळाले',
  'Held until the trip ends':
    'प्रवास संपेपर्यंत राखून ठेवले',
  'Nothing':
    'काहीही नाही',
  // Women-only rides
  'Women passengers only':
    'फक्त महिला प्रवासी',
  'A ride for women passengers only can be offered by a driver whose profile says she is a woman.':
    'फक्त महिला प्रवाशांसाठीचा प्रवास तीच चालक देऊ शकते जिच्या प्रोफाइलमध्ये ती स्त्री असल्याचे लिहिले आहे.',
  'Women only':
    'फक्त महिला',
  'Are for women only':
    'फक्त महिलांसाठी आहेत',
  'Not shown on your profile. Choosing Woman lets you offer and book women-only rides; nobody checks it.':
    'तुमच्या प्रोफाइलवर दाखवले जात नाही. स्त्री निवडल्यास तुम्ही फक्त-महिला प्रवास देऊ आणि बुक करू शकता; याची कोणी तपासणी करत नाही.',
  // Travel passes
  'Weekly pass':
    'साप्ताहिक पास',
  'Monthly pass':
    'मासिक पास',
  'Annual pass':
    'वार्षिक पास',
  'Travel passes':
    'प्रवास पास',
  'Passes':
    'पास',
  'While a pass runs, you pay no service fee on the rides you book. Drivers are paid the same fare either way.':
    'पास चालू असेपर्यंत तुम्ही बुक केलेल्या प्रवासांवर सेवा शुल्क भरत नाही. चालकांना दोन्ही बाबतीत तेवढेच भाडे मिळते.',
  'Your passes':
    'तुमचे पास',
  'You have no pass.':
    'तुमच्याकडे कोणताही पास नाही.',
  'Starts {start}, runs until {end}':
    '{start} पासून सुरू, {end} पर्यंत चालू',
  'Running until {end}':
    '{end} पर्यंत चालू',
  'Ended {end}':
    '{end} रोजी संपला',
  'Buy a pass':
    'पास खरेदी करा',
  'A pass bought while another runs starts when that one ends.':
    'एखादा पास चालू असताना घेतलेला पास तो संपल्यावर सुरू होतो.',
  'Your pass is bought.':
    'तुमचा पास खरेदी झाला.',
  '{n} days':
    '{n} दिवस',
  'Buy {pass}':
    '{pass} खरेदी करा',
  // Receipts
  'Download receipt (PDF, in English)':
    'पावती डाउनलोड करा (PDF, इंग्रजीत)',
  'The receipt could not be downloaded. Try again.':
    'पावती डाउनलोड होऊ शकली नाही. पुन्हा प्रयत्न करा.',
  'Receipt':
    'पावती',
};
