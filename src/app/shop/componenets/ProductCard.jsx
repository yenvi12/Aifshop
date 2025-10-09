export default function ProductCard({ price }) {
    return (
      <div className="rounded overflow-hidden shadow hover:shadow-lg transition">
        <div className="bg-gray-200 h-64" /> {/* placeholder image */}
  
        <div className="p-4">
          <p className="text-sm text-gray-500">Sneakers</p>
          <h3 className="font-semibold mt-1">Minimal and leather sneakers</h3>
          <p className="mt-2 text-lg font-bold">${price}</p>
  
          <button className="mt-4 w-full bg-black text-white py-2 rounded hover:bg-gray-800">
            Add to Cart
          </button>
        </div>
      </div>
    );
  }