"use client";

import { createPost } from "@/app/actions";
import Link from "next/link";

export default function NewPostForm() {
  return (
    <form
      action={createPost}
      className="bg-white p-4 retro-border mb-6 relative shadow-md"
    >
      <div className="flex justify-between items-center border-b-2 border-mural-brown mb-3 pb-2">
        <h3 className="font-bold text-mural-brown">Escrever Recado</h3>
        {/* Link para limpar a URL e fechar o form */}
        <Link
          href="/"
          className="text-red-700 font-bold hover:underline text-sm retro-button-active"
        >
          [X] Fechar
        </Link>
      </div>

      <div className="space-y-3">
        <input
          name="author_name"
          placeholder="Seu nome ou apelido..."
          required
          className="w-full p-2 bg-mural-creme border-2 border-mural-dark focus:outline-none text-sm"
        />

        <textarea
          name="content"
          placeholder="O que está acontecendo em Amparo?"
          required
          rows={3}
          className="w-full p-2 bg-mural-creme border-2 border-mural-dark focus:outline-none text-sm resize-none"
        />

        <div className="flex gap-2">
          <button
            type="submit"
            className="bg-mural-brown text-white px-6 py-2 font-bold retro-border retro-button-active flex-1 md:flex-none"
          >
            Publicar 📢
          </button>

          <Link
            href="/"
            className="bg-mural-creme text-mural-dark px-6 py-2 font-bold retro-border retro-button-active flex items-center justify-center md:flex-none hover:bg-gray-200"
          >
            Cancelar
          </Link>
        </div>
      </div>
    </form>
  );
}
