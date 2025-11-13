import { useState } from "react";
import apiService from "../../services/api";
import type { BlockFormProps } from "../../types/block";

export default function BlockForm({ block, onSaved }: BlockFormProps) {
  // Format date to YYYY-MM-DDTHH:MM for datetime-local input
  const formatForInput = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    // Check if date is valid
    if (isNaN(date.getTime())) return '';
    
    const pad = (num: number) => num.toString().padStart(2, '0');
    
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // Format date to ISO string for the API
  const formatForApi = (dateTimeString: string) => {
    if (!dateTimeString) return '';
    const date = new Date(dateTimeString);
    // If the date is invalid, return current date
    if (isNaN(date.getTime())) return new Date().toISOString();
    return date.toISOString();
  };

  const [title, setTitle] = useState(block?.title || "");
  const [description, setDescription] = useState(block?.description || "");
  const [start, setStart] = useState(block?.start_time ? formatForInput(block.start_time) : '');
  const [end, setEnd] = useState(block?.end_time ? formatForInput(block.end_time) : '');
  const [isPrivate, setIsPrivate] = useState(block?.is_private ?? false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const payload = {
      title,
      description,
      start_time: formatForApi(start),
      end_time: formatForApi(end),
      is_private: isPrivate
    };

    if (block) {
      await apiService.updateChallengeGroup(block.id, payload);
    } else {
      await apiService.createChallengeGroup(payload);
    }

    onSaved();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-11xl w-full mx-auto bg-white p-10 rounded-xl shadow-sm border border-gray-100">
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
          Blok nomi <span className="text-red-500">*</span>
        </label>
        <input
          id="title"
          type="text"
          required
          className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"
          placeholder="Masalan: Dasturlash asoslari"
          value={title}
          onChange={e => setTitle(e.target.value)}
        />
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
          Tavsif
        </label>
        <textarea
          id="description"
          rows={3}
          className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"
          placeholder="Blok haqida qisqacha tavsif..."
          value={description}
          onChange={e => setDescription(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="startTime" className="block text-sm font-medium text-gray-700 mb-1">
            Boshlanish vaqti <span className="text-red-500">*</span>
          </label>
          <input 
            id="startTime"
            type="datetime-local"
            required
            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"
            value={start}
            onChange={e => setStart(e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="endTime" className="block text-sm font-medium text-gray-700 mb-1">
            Tugash vaqti <span className="text-red-500">*</span>
          </label>
          <input 
            id="endTime"
            type="datetime-local"
            required
            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"
            value={end}
            onChange={e => setEnd(e.target.value)}
          />
        </div>
      </div>

      <div className="flex items-start pt-2">
        <div className="flex items-center h-5">
          <input
            id="isPrivate"
            type="checkbox"
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            checked={isPrivate}
            onChange={e => setIsPrivate(e.target.checked)}
          />
        </div>
        <div className="ml-3 text-sm -mt-1">
          <label htmlFor="isPrivate" className="font-medium text-gray-700">
            Maxfiy blok
          </label>
          <p className="text-gray-500">Faqat siz ko'rishingiz mumkin bo'ladi</p>
        </div>
      </div>

      <div className="pt-6 mt-8 border-t border-gray-100">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <i className="fas fa-info-circle"></i>
            <span>Barcha maydonlar to'ldirilishi shart</span>
          </div>
          <div className="flex space-x-3">
          <button
            type="button"
            onClick={() => onSaved()}
            className="px-6 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-200 flex items-center"
          >
            <i className="fas fa-times mr-2"></i>
            Bekor qilish
          </button>
          <button
            type="submit"
            className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-200 shadow-sm hover:shadow-md flex items-center"
          >
            <i className="fas fa-save mr-2"></i>
            {block ? 'O\'zgartirishlarni saqlash' : 'Blokni yaratish'}
          </button>
          </div>
        </div>
      </div>
    </form>
  );
}
