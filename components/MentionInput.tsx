"use client";

import Avatar from "./Avatar";
import {
  ChangeEvent,
  KeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createClient } from "@/utils/supabase/client";
import type { Profile } from "@/utils/types";

type Suggestion = Pick<Profile, "nickname" | "avatar_seed" | "avatar_path">;

type CommonProps = {
  name: string;
  placeholder?: string;
  required?: boolean;
  className?: string;
  defaultValue?: string;
};

type TextareaProps = CommonProps & {
  as: "textarea";
  rows?: number;
};

type InputProps = CommonProps & {
  as: "input";
};

export default function MentionInput(props: TextareaProps | InputProps) {
  const supabase = useMemo(() => createClient(), []);
  const ref = useRef<HTMLTextAreaElement | HTMLInputElement | null>(null);

  const [value, setValue] = useState(props.defaultValue ?? "");
  const [mentionStart, setMentionStart] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [highlight, setHighlight] = useState(0);
  const pendingCursorRef = useRef<number | null>(null);

  useEffect(() => {
    if (pendingCursorRef.current === null) return;
    const el = ref.current;
    if (!el) return;
    const pos = pendingCursorRef.current;
    el.focus();
    el.setSelectionRange(pos, pos);
    pendingCursorRef.current = null;
  }, [value]);

  // React 19 reseta forms automaticamente após action — mas só campos
  // uncontrolled. Como mantemos value em state, escutamos o reset do form pai
  // pra limpar o estado interno também.
  useEffect(() => {
    const form = ref.current?.form;
    if (!form) return;
    const initial = props.defaultValue ?? "";
    function onReset() {
      setValue(initial);
      setMentionStart(null);
      setQuery("");
      setSuggestions([]);
    }
    form.addEventListener("reset", onReset);
    return () => form.removeEventListener("reset", onReset);
  }, [props.defaultValue]);

  // Detecta token @<query> imediatamente antes do cursor.
  function refreshMentionState(text: string, cursor: number) {
    let i = cursor - 1;
    while (i >= 0) {
      const ch = text[i];
      if (ch === "@") {
        const prev = i > 0 ? text[i - 1] : "";
        if (prev === "" || /\s/.test(prev)) {
          const q = text.slice(i + 1, cursor);
          if (/^[A-Za-z0-9_]*$/.test(q) && q.length <= 30) {
            setMentionStart(i);
            setQuery(q);
            setHighlight(0);
            return;
          }
        }
        break;
      }
      if (/\s/.test(ch)) break;
      i--;
    }
    setMentionStart(null);
    setQuery("");
    setSuggestions([]);
  }

  function handleChange(
    e: ChangeEvent<HTMLTextAreaElement | HTMLInputElement>,
  ) {
    const next = e.target.value;
    setValue(next);
    refreshMentionState(next, e.target.selectionStart ?? next.length);
  }

  // Re-checa o estado quando o cursor anda sem mudar texto (clique, setas)
  function handleSelect() {
    const el = ref.current;
    if (!el) return;
    refreshMentionState(el.value, el.selectionStart ?? el.value.length);
  }

  // Busca sugestões (debounced)
  useEffect(() => {
    if (mentionStart === null) return;
    const handle = setTimeout(async () => {
      const { data } = await supabase
        .from("profiles")
        .select("nickname, avatar_seed, avatar_path")
        .ilike("nickname", `${query}%`)
        .not("nickname", "is", null)
        .order("nickname")
        .limit(5);
      setSuggestions((data ?? []) as Suggestion[]);
      setHighlight(0);
    }, 120);
    return () => clearTimeout(handle);
  }, [mentionStart, query, supabase]);

  function applySuggestion(nick: string) {
    if (mentionStart === null) return;
    const el = ref.current;
    if (!el) return;
    const before = value.slice(0, mentionStart);
    const after = value.slice(el.selectionStart ?? value.length);
    const insert = `@${nick} `;
    const nextValue = before + insert + after;
    pendingCursorRef.current = (before + insert).length;
    setValue(nextValue);
    setMentionStart(null);
    setQuery("");
    setSuggestions([]);
  }

  function handleKeyDown(
    e: KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>,
  ) {
    if (mentionStart === null || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => (h + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight(
        (h) => (h - 1 + suggestions.length) % suggestions.length,
      );
    } else if (e.key === "Enter" || e.key === "Tab") {
      const pick = suggestions[highlight];
      if (pick?.nickname) {
        e.preventDefault();
        applySuggestion(pick.nickname);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setMentionStart(null);
      setSuggestions([]);
    }
  }

  const showDropdown = mentionStart !== null && suggestions.length > 0;

  const sharedProps = {
    name: props.name,
    placeholder: props.placeholder,
    required: props.required,
    className: props.className,
    value,
    onChange: handleChange,
    onSelect: handleSelect,
    onClick: handleSelect,
    onKeyUp: handleSelect,
    onKeyDown: handleKeyDown,
  };

  return (
    <div className="relative">
      {props.as === "textarea" ? (
        <textarea
          ref={ref as React.RefObject<HTMLTextAreaElement>}
          rows={props.rows}
          {...sharedProps}
        />
      ) : (
        <input
          ref={ref as React.RefObject<HTMLInputElement>}
          {...sharedProps}
        />
      )}

      {showDropdown && (
        <ul className="absolute left-0 right-0 top-full mt-1 z-30 bg-white retro-border shadow-lg max-h-56 overflow-y-auto text-mural-dark">
          {suggestions.map((s, idx) => {
            return (
              <li key={s.nickname}>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    if (s.nickname) applySuggestion(s.nickname);
                  }}
                  onMouseEnter={() => setHighlight(idx)}
                  className={`w-full flex items-center gap-2 px-2 py-1 text-left text-xs ${
                    idx === highlight ? "bg-mural-creme" : ""
                  }`}
                >
                  <span className="w-6 h-6 bg-mural-brown retro-border overflow-hidden shrink-0">
                    <Avatar
                      avatarPath={s.avatar_path}
                      seed={s.avatar_seed}
                      name={s.nickname}
                      size={24}
                    />
                  </span>
                  <span className="font-bold">@{s.nickname}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
