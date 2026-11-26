Rails.application.routes.draw do
  # Define your application routes per the DSL in https://guides.rubyonrails.org/routing.html

  # Reveal health status on /up that returns 200 if the app boots with no exceptions, otherwise 500.
  # Can be used by load balancers and uptime monitors to verify that the app is live.
  get "up" => "rails/health#show", as: :rails_health_check

  namespace :api do
    resource :session, only: %i[show create destroy]
    resource :registration, only: :create
    resource :account, only: :destroy
    resources :projects, only: %i[index create show update destroy] do
      resources :samples, only: :create
    end

    get "shared/:token", to: "shared#show"
    post "shared/:token/copy", to: "shared#copy"
  end

  # Defines the root path route ("/")
  # root "posts#index"
end
