import { useEffect, useState } from "react";
import apiService from "../../services/api";
import type { Block, Challenge } from "../../types/block";

interface SelectChallengesModalProps {
  block: Block;
  onClose: () => void;
  onSaved: () => void;
}

export default function SelectChallengesModal({ block, onClose, onSaved }: SelectChallengesModalProps) {
  const [questions, setQuestions] = useState<Challenge[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const all = await apiService.getChallenges();
      setQuestions(all);
      
      // Blokdagi mavjud savollarni olish
      const assigned = block.challenges || [];
      
      // Faqat to'g'ri raqamli ID larni olamiz
      const validAssignedIds = assigned
        .map((q: Challenge) => q?.id)
        .filter((id): id is number => id !== undefined && id !== null && !isNaN(Number(id)));
      
      // Yangi Set yaratib, tanlangan savollarni qo'shamiz
      const selectedSet = new Set<number>();
      validAssignedIds.forEach(id => selectedSet.add(id));
      
      setSelected(selectedSet);
    } catch (error) {
      console.error('Error loading challenges:', error);
      alert('Savollarni yuklashda xatolik yuz berdi');
    }
  }

  function toggle(id: number | undefined) {
    // Agar ID undefined yoki not a number bo'lsa, hech narsa qilmaymiz
    if (id === undefined || id === null || isNaN(Number(id))) {
      console.warn('Invalid challenge ID:', id);
      return;
    }
    
    const updated = new Set(selected);
    updated.has(id) ? updated.delete(id) : updated.add(id);
    setSelected(updated);
  }

  async function save() {
    try {
      if (selected.size === 0) {
        alert('Iltimos, kamida bitta savolni tanlang!');
        return;
      }
      
      await apiService.updateBlockChallenges(block.id, Array.from(selected));
      onSaved();
      onClose();
    } catch (error) {
      console.error('Error updating block challenges:', error);
      alert('Xatolik yuz berdi: ' + (error instanceof Error ? error.message : 'Noma\'lum xatolik'));
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4 text-center">
        <div className="fixed inset-0 bg-black/30 transition-opacity" aria-hidden="true" onClick={onClose}></div>

        <div className="inline-block w-full max-w-3xl transform overflow-hidden rounded-lg bg-white text-left align-middle shadow-xl transition-all">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
                <i className="fas fa-tasks text-blue-600"></i>
              </div>
              <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                  {block.title} - Savollarni tanlang
                </h3>
                
                <div className="mt-4 max-h-96 overflow-y-auto pr-2">
                  {questions.length > 0 ? (
                    <div className="space-y-2">
                      {questions.map((q: Challenge) => (
                        <label 
                          key={q.id} 
                          className={`flex items-center p-3 rounded-lg border ${
                            selected.has(q.id) 
                              ? 'bg-blue-50 border-blue-200' 
                              : 'border-gray-200 hover:bg-gray-50'
                          } transition-colors duration-150 cursor-pointer`}
                        >
                          <div className="flex items-center h-5">
                            <input
                              type="checkbox"
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                              checked={selected.has(q.id)}
                              onChange={() => toggle(q.id)}
                            />
                          </div>
                          <div className="ml-3">
                            <p className="text-sm font-medium text-gray-900">{q.title}</p>
                            {q.description && (
                              <p className="text-xs text-gray-500 mt-1">{q.description}</p>
                            )}
                          </div>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <i className="fas fa-inbox text-4xl text-gray-300 mb-2"></i>
                      <p className="text-gray-500">Savollar topilmadi</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              onClick={save}
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm transition-colors duration-200"
            >
              <i className="fas fa-save mr-2"></i>
              Saqlash
            </button>
            <button
              type="button"
              onClick={onClose}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm transition-colors duration-200"
            >
              Bekor qilish
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
