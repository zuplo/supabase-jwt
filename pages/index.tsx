import Head from "next/head";
import Image from "next/image";
import { Inter } from "@next/font/google";
import { Auth, ThemeMinimal, ThemeSupa } from "@supabase/auth-ui-react";
import {
  createClient,
  Provider,
  Session,
  SupabaseClient,
} from "@supabase/supabase-js";
import { useEffect, useMemo, useState } from "react";
import { ExclamationTriangleIcon } from "@heroicons/react/20/solid";
import { useSupabaseClient, useUser } from "@supabase/auth-helpers-react";

const inter = Inter({ subsets: ["latin"] });

const providers: Provider[] = [
  "apple",
  "azure",
  "bitbucket",
  "discord",
  "facebook",
  "github",
  "gitlab",
  "google",
  "keycloak",
  "linkedin",
  "notion",
  "slack",
  "spotify",
  "twitch",
  "twitter",
  "workos",
];

interface AuthPanelProps {
  client: SupabaseClient;
}

const AuthPanel = ({ client }: AuthPanelProps) => {
  const [enabledProviders, setEnabledProviders] = useState<Provider[]>([]);
  return (
    <>
      <div className="grid grid-cols-3 text-sm">
        {providers.map((p) => {
          const selected = enabledProviders.includes(p);
          return (
            <div key={p} className="flex flex-row items-center">
              <input
                id={`cb_${p}`}
                type="checkbox"
                checked={selected}
                className="mr-1"
                onChange={() => {
                  if (selected) {
                    const newValue = [...enabledProviders];
                    const index = newValue.indexOf(p);
                    newValue.splice(index, 1);
                    setEnabledProviders(newValue);
                  } else {
                    setEnabledProviders([...enabledProviders, p]);
                  }
                }}
              />
              <label
                htmlFor={`cb_${p}`}
                className="hover:underline cursor-pointer"
              >
                {p}
              </label>
            </div>
          );
        })}
      </div>
      <div className="max-w-sm pt-10 border border-gray p-10 shadow-xl">
        <div className="text-lg font-bold">Supabase Login</div>
        <Auth
          magicLink
          redirectTo="https://supabasejwt.com/"
          socialLayout={enabledProviders.length > 5 ? "vertical" : "horizontal"}
          supabaseClient={client}
          appearance={{
            theme: ThemeSupa,
          }}
          providers={enabledProviders}
        />
      </div>
    </>
  );
};

interface SessionPanelProps {
  client: SupabaseClient;
  session: Session;
}

const SessionPanel = ({ session, client }: SessionPanelProps) => {
  return (
    <>
      <div className="flex flex-row justify-between">
        <div className="flex-none">
          <div className="font-bold">You are signed in as</div>
          <div>{session.user.email}</div>
        </div>
        <div>
          {" "}
          <button
            type="button"
            className="bg-pink-500 hover:bg-pink-600 text-white rounded py-1 px-4 shadow"
            onClick={() => {
              client.auth.signOut();
            }}
          >
            Logout
          </button>
        </div>
      </div>
      <div>
        <div className="font-bold">Access Token (JWT)</div>
        <div
          className="break-words font-mono"
          onDoubleClick={(evt) => {
            window.getSelection()?.selectAllChildren(evt.target as any);
          }}
        >
          {session.access_token}
        </div>
      </div>
      <div>
        <div className="font-bold">JWT data</div>
        <pre className="break-words">
          {JSON.stringify(
            JSON.parse(atob(session.access_token.split(".")[1])),
            null,
            2
          )}
        </pre>
      </div>
    </>
  );
};

const checkForServiceRole = (jwt: string) => {
  const split = jwt.split(".");
  if (split.length !== 3) {
    return false; // not a jwt, but not the service role either then
  }
  try {
    const payload = split[1];
    const json = atob(payload);
    const data = JSON.parse(json);
    return data.role === "service_role";
  } catch (err) {
    return false; // not a valid JWT
  }
};

const URL_STORAGE_KEY = "SB_URL";
const KEY_STORAGE_KEY = "SB_KEY";

const getCachedItem = (key: string) => {
  // to support NextJS - we won't use localStorage on build
  if (typeof window === "undefined") {
    // we're on the server
    return undefined;
  }
  const cached = localStorage.getItem(key);
  return cached ?? undefined;
};

export default function Home() {
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState<string | undefined>();
  const [url, setUrl] = useState<string | undefined>(
    getCachedItem(URL_STORAGE_KEY)
  );
  const [key, setKey] = useState<string | undefined>(
    getCachedItem(KEY_STORAGE_KEY)
  );

  const supabase = useMemo(() => {
    if (!key || !url) {
      setError("A valid Supabase Key and URL are required");
      return;
    }
    try {
      const client = createClient(url, key);
      setError(undefined);
      return client;
    } catch (err: any) {
      setError(err.message);
    }
  }, [key, url]);

  useEffect(() => {
    // guard
    if (!supabase) return;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === "SIGNED_IN" || event === "TOKEN_REFRESHED")) {
        setSession(session);
      }

      if (event === "SIGNED_OUT") {
        setSession(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, supabase?.auth]);

  const updateKey = (key: string) => {
    const isServiceRole = checkForServiceRole(key);
    if (isServiceRole) {
      alert(
        "This is your service_role key - do not share this willy nilly. We only need your anon key. Input rejected"
      );
      setKey("");
      return;
    }
    setKey(key);
    localStorage.setItem(KEY_STORAGE_KEY, key);
  };

  const updateUrl = (url: string) => {
    setUrl(url);
    localStorage.setItem(URL_STORAGE_KEY, url);
  };

  return (
    <>
      <Head>
        <title>JWT Generator for Supabase</title>
      </Head>

      <div className="m-10 max-w-lg flex flex-col space-y-6">
        <h1 className="text-4xl font-bold flex flex-row items-top">
          <img src="/sb-jwt-no-bg.png" className="h-8 w-auto mt-1 mr-2" />
          JWT Generator for Supabase
        </h1>
        <h2 className="text-xl text-green-500">
          <em>&ldquo;because sometimes you just want a JWT token</em>&rdquo;
        </h2>
        <div className="text-sm">
          <div className="flex flex-row items-start rounded-t bg-gray-300 p-3">
            <ExclamationTriangleIcon className="w-4 h-auto flex-none mt-0.5 mr-1 text-pink-500" />
            This is a fully client-side application designed to help you quickly
            get a JWT token for supabase. No data is sent to our servers. Your
            passwords, keys and JWT tokens are not recorded by us. Your public
            URL and KEY are stored in localStorage on your machine.
          </div>
          <div className="rounded-b bg-gray-200 p-4">
            <div className="text-gray-600 text-xs pb-2">INSTRUCTIONS</div>
            <ol>
              <li>
                1. Enter your Supabase URL and <b>anon</b> key.
              </li>
              <li>
                2. Add{" "}
                <span
                  className="font-mono text-xs text-green-600"
                  onDoubleClick={(evt) => {
                    window.getSelection()?.selectAllChildren(evt.target as any);
                  }}
                >
                  https://supabasejwt.com/
                </span>{" "}
                to your redirect domains.
              </li>
              <li>3. Choose your providers below and login 👏</li>
            </ol>
          </div>
        </div>

        {!session && (
          <>
            <div>
              <div className="font-bold">
                Supabase URL{" "}
                <span className="text-xs text-gray-500 font-light">
                  get from Settings &gt; API
                </span>
              </div>
              <input
                type="text"
                className="rounded border-gray-500 border w-full font-mono p-1 text-sm"
                value={url}
                onChange={(evt) => updateUrl(evt.target.value)}
              />
            </div>
            <div>
              <div className="font-bold">
                Anon Key{" "}
                <span className="text-xs text-gray-500 font-light">
                  not service_role get from Settings &gt; API
                </span>
              </div>
              <input
                type="text"
                className="rounded border-gray-400 border w-full font-mono p-1 text-sm"
                value={key}
                onChange={(evt) => updateKey(evt.target.value)}
              />
            </div>
          </>
        )}
        {error && (
          <div className="text-pink-500 flex flex-row items-center">
            <ExclamationTriangleIcon className="w-4 h-auto mr-1 mt-0.5" />
            {error}
          </div>
        )}
        {supabase &&
          (session ? (
            <SessionPanel client={supabase} session={session} />
          ) : (
            <AuthPanel client={supabase} />
          ))}
        <div className="text-xs text-gray-600 border-t">
          Provided by the folks at{" "}
          <a
            href="https://zuplo.com/"
            className="text-pink-500 hover:underline"
          >
            zuplo
          </a>{" "}
          - a free, serverless API gateway. Get the{" "}
          <a
            href="https://github.com/zuplo/supabase-jwt"
            className="text-pink-500 hover:underline"
          >
            source and contribute on GitHub
          </a>
          .
        </div>
      </div>
    </>
  );
}
