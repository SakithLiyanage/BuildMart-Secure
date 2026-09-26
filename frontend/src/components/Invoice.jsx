//imports and helper functions
import React, { useRef } from "react";
import { motion } from "framer-motion";
import { FiPrinter, FiDownload, FiX, FiCheckCircle } from "react-icons/fi";

// Helper function for formatting currency
const formatCurrency = (amount) => {
  return `LKR ${Number(amount).toFixed(2)}`;
};

// Helper to generate invoice number
const generateInvoiceNumber = () => {
  return `INV-${Math.floor(100000 + Math.random() * 900000)}`;
};

//component definition and initialization
const Invoice = ({ isOpen, onClose, cartItems, total, paymentDetails }) => {
  const invoiceRef = useRef(null);
  const invoiceNumber = generateInvoiceNumber();
  const today = new Date();
  const date = today.toLocaleDateString('en-GB');
  const time = today.toLocaleTimeString('en-GB');

  // Calculate subtotal, tax, etc.
  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shipping = 350;
  const tax = subtotal * 0.15;

  //print and download functions
  // V-DOMXSS remediation: the original implementation read invoiceRef.current.innerHTML
  // (a string) and reassigned it to document.body.innerHTML, then reloaded the page.
  // Reassigning arbitrary HTML strings into document.body is the classic CWE-79 DOM-XSS
  // sink pattern, and it also destroyed the entire React app on every print. This version
  // never touches document.body and never serializes DOM to an HTML string at all: it
  // clones the already-rendered invoice node with cloneNode() (a structural DOM clone,
  // not string parsing) into an isolated hidden iframe, prints just that iframe, then
  // removes it, so the running app is untouched and there is no HTML-injection surface.
  const handlePrint = () => {
    const invoiceNode = invoiceRef.current;
    if (!invoiceNode) return;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.visibility = 'hidden';
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
    iframeDoc.open();
    iframeDoc.write('<!DOCTYPE html><html><head><title>Invoice</title></head><body></body></html>');
    iframeDoc.close();

    // Carry over the page's stylesheets so the printed invoice keeps its styling.
    document.querySelectorAll('link[rel="stylesheet"], style').forEach((node) => {
      iframeDoc.head.appendChild(node.cloneNode(true));
    });

    // Structural clone of the already-rendered (React-escaped) invoice DOM node.
    iframeDoc.body.appendChild(invoiceNode.cloneNode(true));

    const cleanup = () => {
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
    };

    // Give the cloned stylesheets a moment to apply before printing.
    setTimeout(() => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
      setTimeout(cleanup, 500);
    }, 250);
  };

  const handleDownload = () => {
    // Convert invoice to PDF and download
    // Using browser print to PDF for simplicity
    handlePrint();
  };

  if (!isOpen) return null;

  //modal content
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="relative bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex justify-between items-center p-6 border-b bg-white">
          <h2 className="text-2xl font-bold text-gray-800">Invoice</h2>
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
              title="Print Invoice"
            >
              <FiPrinter size={20} />
            </button>
            <button
              onClick={handleDownload}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
              title="Download Invoice"
            >
              <FiDownload size={20} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
              title="Close"
            >
              <FiX size={20} />
            </button>
          </div>
        </div>

        {/* Success Message */}
        <div className="bg-green-50 p-4 border-b border-green-100 flex items-center gap-3">
          <FiCheckCircle className="text-green-500" size={24} />
          <div>
            <h3 className="font-semibold text-green-800">Payment Successful</h3>
            <p className="text-green-700 text-sm">Thank you for your purchase!</p>
          </div>
        </div>

        {/* Invoice Content */}
        <div className="p-6" ref={invoiceRef}>
          <div className="mb-8 flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-indigo-700 mb-1">BuildMart</h1>
              <p className="text-gray-600">123 Construction Ave</p>
              <p className="text-gray-600">Colombo, Sri Lanka</p>
              <p className="text-gray-600">Tel: +94 11 123 4567</p>
            </div>
            <div className="text-right">
              <h2 className="text-xl font-bold text-gray-800">INVOICE</h2>
              <p className="text-gray-600 font-medium">{invoiceNumber}</p>
              <p className="text-gray-600">{date}</p>
              <p className="text-gray-500 text-sm">{time}</p>
            </div>
          </div>

          <div className="border-t border-b border-gray-200 py-4 mb-6">
            <h3 className="font-semibold text-lg mb-2">Payment Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Payment Method</p>
                <p className="font-medium">{paymentDetails?.cardType?.toUpperCase() || "Credit Card"} •••• {paymentDetails?.lastFourDigits || "****"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Cardholder</p>
                <p className="font-medium">{paymentDetails?.cardholderName || "Card Holder"}</p>
              </div>
            </div>
          </div>

          <h3 className="font-semibold text-lg mb-3">Order Summary</h3>
          <div className="overflow-auto mb-6">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {cartItems.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="text-sm font-medium text-gray-900">{item.name}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center text-sm text-gray-500">{item.quantity}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-gray-500">{formatCurrency(item.price)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-gray-900">{formatCurrency(item.price * item.quantity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="border-t border-gray-200 pt-4 mb-8">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600">Subtotal</span>
              <span className="text-gray-800">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600">Shipping</span>
              <span className="text-gray-800">{formatCurrency(shipping)}</span>
            </div>
            <div className="flex justify-between text-sm mb-3">
              <span className="text-gray-600">Tax (15%)</span>
              <span className="text-gray-800">{formatCurrency(tax)}</span>
            </div>
            <div className="flex justify-between font-bold text-lg">
              <span>Total</span>
              <span className="text-indigo-700">{formatCurrency(total)}</span>
            </div>
          </div>

          <div className="text-center text-gray-500 text-sm mt-12">
            <p>Thank you for shopping with BuildMart!</p>
            <p>For any inquiries, please contact customer service at support@buildmart.com</p>
          </div>
        </div>

        <div className="sticky bottom-0 bg-gradient-to-t from-white via-white p-6 pt-3">
          <button
            onClick={onClose}
            className="w-full py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
          >
            Continue Shopping
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default Invoice;