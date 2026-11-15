/**
 * Policy text for /policy, written as markdown and rendered with snarkdown.
 * Keep it plain and specific: say what actually happens on this site.
 */

const shipping: string = `
We ship within India only.

Orders go out by courier 3 to 14 days after payment, depending on the maker and whether the item is made to order. If a different date was agreed when the order was confirmed, that date applies.

Delivery is a flat ₹99 per order.

Our part is getting your parcel to the courier inside that window. Once the courier has it, the delivery time is theirs, and we can't be held responsible for their delays.

We deliver to the address you give at checkout, so check it before you pay. We email you when the order is confirmed and when its status changes.`;

const cancellation: string = `
**Can I cancel an order?**

Yes, on the day you place it, as long as the maker hasn't started shipping it. Write to **support@selfcrafted.in** from the email address you ordered with and include your order ID.

**What can't be cancelled or refunded?**

Listings marked as non-returnable on their own page.

**What if it arrives damaged or faulty?**

Tell us the day it arrives. Write to **support@selfcrafted.in** from the email address you ordered with, and include your order ID and photos. The maker checks the report, and we decide each case on what we find.

**What if it isn't what the listing showed?**

Tell us the day it arrives, the same way. We'll look into it and tell you what we can do.

**What about products with a warranty or guarantee?**

If the listing carries a Selfcrafted warranty or guarantee, write to support@selfcrafted.in with your order ID. We review every claim. We can refuse one if the product shows signs of tampering, fraud or damage.

**How long does a refund take?**

Once we approve a refund, it takes 9 to 15 days to reach you.`;

const risks: string = `
Every listing is one of two kinds.

**Selfcrafted Original**

We made it, or it was built under our supervision. We look after it even after it reaches you, including any warranty or guarantee on the listing.

**Selfcrafted Approved**

An independent maker built it and we approved the listing. These are often early or small-batch products, so they may not be finished to factory standard.

We guarantee that what you ordered reaches you. If it arrives and doesn't work as described, write to support@selfcrafted.in. We'll take it up with the maker, who is responsible for a product that doesn't do what the listing says, and we decide these case by case.`;

const privacy: string = `
This is what Selfcrafted stores about you and why. If it changes, we'll update this page.

**What we store**

* Your email address and username.
* Your name and profile photo, if you sign in with Google.
* The delivery addresses and phone number you enter at checkout or save to your account.
* Your orders, reviews and messages with makers.
* Any 3D models you upload to request a print.

**What we use it for**

* Running your account and delivering your orders. Whoever packs and ships your order needs your delivery details to do it.
* Emailing you about your account, your orders and your print requests. We don't send marketing email unless you ask for it.
* Keeping our own records.

**Payments**

Payments go through Razorpay. Your card, UPI and bank details go to them. We never see or store them.

**Cookies**

We use cookies to keep you signed in and to remember your cart. Your light or dark theme choice is saved in your browser. We don't use advertising or tracking cookies. If you block cookies, sign-in and the cart won't work.

**Error reports**

When something breaks, an error report goes to Sentry so we can fix it.

**Sharing**

We don't sell, rent or trade your personal information.

**Deleting your data**

To delete your account, write to support@selfcrafted.in from the email address on the account.`;

const terms: string = `
On this page, "we", "us" and "our" mean **Selfcrafted**. "You" means anyone who visits this website or buys through it.

By using this website or buying through it, you agree to the following.

* What's on these pages can change without notice.

* We don't guarantee that the information on this website is accurate, complete, up to date or suitable for any particular purpose. It may contain mistakes, and to the fullest extent the law allows we aren't liable for them.

* You use the information and products on this website at your own risk. It's up to you to check that a product meets your needs.

* The design, layout, look and graphics of this website are owned by us or licensed to us.

* Using information from this website without permission may lead to a claim for damages and may be a criminal offence.

* We sometimes link to other websites for your convenience. We aren't responsible for what's on them.

* Any dispute arising from your use of this website, a purchase through it or any dealings with us is governed by the laws of India.`;

const contact: string = `
Email: **support@selfcrafted.in**

WhatsApp or SMS: **+91 86374 52606**`;

interface ABOUTSTR {
	risks: string;
	privacy: string;
	terms: string;
	shipping: string;
	cancellation: string;
	contact: string;
}

export const ABOUT_STRINGS: ABOUTSTR = {
	risks,
	privacy,
	terms,
	shipping,
	cancellation,
	contact
};
