import React from 'react';

export default function Login() {
  return (
    <section className="min-h-screen flex items-center justify-center bg-slate-50 py-8 px-4 sm:px-6 lg:px-8 font-sans">
    <div className="max-w-md w-full space-y-8">
      <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Sign in to your business account</h1>
          <p className="text-slate-600 mb-6 text-base">Access your dashboard, manage clients, and grow your business with our secure platform.</p>
            <form className="space-y-6" action="#" method="POST" aria-label="Login form">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-900 mb-1">Email address</label>
                  <input id="email" name="email" type="email" autoComplete="email" required aria-required="true" className="border border-slate-300 rounded-lg px-4 py-3 w-full focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition outline-none text-base" placeholder="you@business.com" />
                </div>
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-slate-900 mb-1">Password</label>
                    <input id="password" name="password" type="password" autoComplete="current-password" required aria-required="true" className="border border-slate-300 rounded-lg px-4 py-3 w-full focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition outline-none text-base" placeholder="Enter your password" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <input id="remember-me" name="remember-me" type="checkbox" className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded" aria-checked="false" />
                      <label htmlFor="remember-me" className="ml-2 block text-sm text-slate-600">Remember me</label>
                      </div>
                      <div className="text-sm">
                        <a href="#" className="font-medium text-indigo-600 hover:text-indigo-700 transition-colors">Forgot password?</a>
                        </div>
                      </div>
                      <button type="submit" aria-label="Sign in to your account" className="w-full bg-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors text-base focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:ring-offset-2">Sign in</button>
                      </form>
                      <div className="mt-8">
                        <div className="flex items-center justify-center">
                          <span className="text-slate-400 text-sm">or sign in with</span>
                          </div>
                          <div className="mt-4 grid grid-cols-3 gap-3">
                            <button type="button" className="flex justify-center items-center bg-slate-50 border border-slate-200 rounded-lg p-3 hover:bg-slate-100 transition" aria-label="Sign in with Google">
                              <img src="https://landinggo.com/assets/img/stock/login/google.svg" alt="Google" className="w-5 h-5" loading="lazy" width="20" height="20" />
                            </button>
                            <button type="button" className="flex justify-center items-center bg-slate-50 border border-slate-200 rounded-lg p-3 hover:bg-slate-100 transition" aria-label="Sign in with Facebook">
                              <img src="https://landinggo.com/assets/img/stock/login/facebook.svg" alt="Facebook" className="w-5 h-5" loading="lazy" width="20" height="20" />
                            </button>
                            <button type="button" className="flex justify-center items-center bg-slate-50 border border-slate-200 rounded-lg p-3 hover:bg-slate-100 transition" aria-label="Sign in with LinkedIn">
                              <img src="https://landinggo.com/assets/img/stock/login/linkedin.svg" alt="LinkedIn" className="w-5 h-5" loading="lazy" width="20" height="20" />
                            </button>
                          </div>
                        </div>
                        <p className="mt-8 text-center text-sm text-slate-600">Don't have an account?
            <a href="#" className="text-indigo-600 font-medium hover:text-indigo-700 transition-colors">Create one</a>
                        </p>
                      </div>
                    </div>
                  </section>
  );
}